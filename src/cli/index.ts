#!/usr/bin/env node
import { Command } from 'commander'
import { createHash } from 'node:crypto'
import { password as passwordPrompt } from '@inquirer/prompts'
import { VaultStore, getConfig, saveConfig } from '../core/store'
import { generateCode, getTimeRemaining, parseOtpauthUri, validateSecret } from '../core/totp'
import { deriveKey } from '../core/crypto'
import { startApiServer } from '../core/api'

const program = new Command()

program
  .name('sesame')
  .description('Agent-readable TOTP authenticator')
  .version('0.1.0')

async function createStore(): Promise<VaultStore> {
  const store = new VaultStore()
  await store.init()
  return store
}

async function getMasterKey(): Promise<Buffer> {
  const config = getConfig()
  // Allow non-interactive usage via env var (for agents)
  const envPassword = process.env.SESAME_PASSWORD
  const pw = envPassword ?? await passwordPrompt({ message: 'Master password:' })
  return deriveKey(pw, config.salt)
}

program
  .command('add <name>')
  .description('Add a TOTP account')
  .option('-s, --secret <secret>', 'TOTP secret key (BASE32)')
  .option('-u, --uri <uri>', 'otpauth:// URI')
  .option('-i, --issuer <issuer>', 'Account issuer', '')
  .action(async (name: string, opts: { secret?: string; uri?: string; issuer?: string }) => {
    let secret = opts.secret ?? ''
    let issuer = opts.issuer ?? ''

    if (opts.uri) {
      const parsed = parseOtpauthUri(opts.uri)
      secret = parsed.secret
      issuer = parsed.issuer || issuer
      if (!name || name === parsed.name) name = parsed.name
    }

    if (!secret) {
      console.error('Error: provide --secret or --uri')
      process.exit(1)
    }

    if (!validateSecret(secret)) {
      console.error('Error: invalid TOTP secret (must be valid BASE32)')
      process.exit(1)
    }

    const key = await getMasterKey()
    const store = await createStore()
    try {
      store.addAccount(name, issuer, secret, key)
      console.log(`Added account: ${name}`)
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) {
        console.error(`Error: account "${name}" already exists`)
        process.exit(1)
      }
      throw e
    } finally {
      store.close()
    }
  })

program
  .command('get <name>')
  .description('Get current TOTP code for an account')
  .option('--raw', 'Print only the code (no remaining time)')
  .action(async (name: string, opts: { raw?: boolean }) => {
    const key = await getMasterKey()
    const store = await createStore()
    try {
      const secret = store.getDecryptedSecret(name, key)
      if (!secret) {
        console.error(`Error: account "${name}" not found`)
        process.exit(1)
      }
      store.logAccess(name, 'cli')
      const code = generateCode(secret)
      if (opts.raw) {
        process.stdout.write(code)
      } else {
        const remaining = getTimeRemaining()
        console.log(`${code}  (${remaining}s remaining)`)
      }
    } finally {
      store.close()
    }
  })

program
  .command('list')
  .description('List all accounts')
  .action(async () => {
    const store = await createStore()
    try {
      const accounts = store.listAccounts()
      if (accounts.length === 0) {
        console.log('No accounts. Use "sesame add" to add one.')
        return
      }
      for (const a of accounts) {
        const label = a.issuer ? `${a.issuer}: ${a.name}` : a.name
        console.log(`  ${label}`)
      }
    } finally {
      store.close()
    }
  })

program
  .command('remove <name>')
  .description('Remove an account')
  .action(async (name: string) => {
    const store = await createStore()
    try {
      const removed = store.removeAccount(name)
      if (removed) {
        console.log(`Removed account: ${name}`)
      } else {
        console.error(`Error: account "${name}" not found`)
        process.exit(1)
      }
    } finally {
      store.close()
    }
  })

program
  .command('serve')
  .description('Start the API server')
  .action(async () => {
    const key = await getMasterKey()
    const store = await createStore()
    const config = getConfig()
    const server = await startApiServer(store, key)
    console.log(`Sesame API server listening on http://127.0.0.1:${config.port}`)
    console.log('Press Ctrl+C to stop')

    const shutdown = async () => {
      console.log('\nShutting down...')
      await server.close()
      store.close()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  })

program
  .command('config')
  .description('Configure sesame')
  .option('-p, --port <port>', 'API server port')
  .option('-t, --token <token>', 'Set API bearer token')
  .option('--clear-token', 'Remove API token requirement')
  .action(async (opts: { port?: string; token?: string; clearToken?: boolean }) => {
    const config = getConfig()

    if (opts.port) {
      config.port = parseInt(opts.port, 10)
      console.log(`Port set to ${config.port}`)
    }
    if (opts.token) {
      config.apiTokenHash = createHash('sha256').update(opts.token).digest('hex')
      console.log('API token set')
    }
    if (opts.clearToken) {
      delete config.apiTokenHash
      console.log('API token cleared')
    }

    saveConfig(config)
  })

program
  .command('status')
  .description('Show vault and API status')
  .action(async () => {
    const config = getConfig()
    const store = await createStore()
    const accounts = store.listAccounts()
    const auditLog = store.getAuditLog(5)
    store.close()

    console.log(`Vault: ~/.sesame/vault.db`)
    console.log(`Accounts: ${accounts.length}`)
    console.log(`API port: ${config.port}`)
    console.log(`API token: ${config.apiTokenHash ? 'configured' : 'none'}`)

    // Check if API server is running
    try {
      const resp = await fetch(`http://127.0.0.1:${config.port}/health`)
      if (resp.ok) {
        console.log(`API server: running`)
      } else {
        console.log(`API server: not running`)
      }
    } catch {
      console.log(`API server: not running`)
    }

    if (auditLog.length > 0) {
      console.log(`\nRecent access:`)
      for (const entry of auditLog) {
        console.log(`  ${entry.timestamp} | ${entry.account_name} | ${entry.requester}`)
      }
    }
  })

program
  .command('export')
  .description('Export vault (encrypted JSON)')
  .option('-o, --output <path>', 'Output file path', 'sesame-export.json')
  .action(async (opts: { output: string }) => {
    const key = await getMasterKey()
    const store = await createStore()
    const accounts = store.listAccounts()

    const exportData = accounts.map((a) => ({
      name: a.name,
      issuer: a.issuer,
      encrypted_secret: a.encrypted_secret,
      created_at: a.created_at,
    }))

    const { writeFileSync } = await import('node:fs')
    writeFileSync(opts.output, JSON.stringify({ version: 1, accounts: exportData }, null, 2))
    console.log(`Exported ${accounts.length} accounts to ${opts.output}`)
    console.log('Note: secrets remain encrypted with your master password')
    store.close()
  })

program
  .command('import')
  .description('Import vault from exported JSON')
  .argument('<path>', 'Path to exported JSON file')
  .action(async (filePath: string) => {
    const { readFileSync, existsSync } = await import('node:fs')
    if (!existsSync(filePath)) {
      console.error(`Error: file not found: ${filePath}`)
      process.exit(1)
    }

    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    if (!data.version || !Array.isArray(data.accounts)) {
      console.error('Error: invalid export file')
      process.exit(1)
    }

    const store = await createStore()
    let imported = 0
    let skipped = 0

    for (const account of data.accounts) {
      try {
        store.importAccountRaw(account.name, account.issuer, account.encrypted_secret)
        imported++
      } catch {
        skipped++
      }
    }

    store.close()
    console.log(`Imported ${imported} accounts (${skipped} skipped/duplicates)`)
    console.log('Note: imported secrets must be from the same master password')
  })

program.parse()

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { encrypt, decrypt, generateSalt } from './crypto'

export interface StoredAccount {
  id: number
  name: string
  issuer: string
  encrypted_secret: string
  created_at: string
}

export interface AuditEntry {
  id: number
  account_name: string
  requester: string
  timestamp: string
}

export interface Config {
  salt: string
  port: number
  apiTokenHash?: string
}

const SESAME_DIR = path.join(os.homedir(), '.sesame')
const DB_PATH = path.join(SESAME_DIR, 'vault.db')
const CONFIG_PATH = path.join(SESAME_DIR, 'config.json')

function ensureDir() {
  if (!fs.existsSync(SESAME_DIR)) {
    fs.mkdirSync(SESAME_DIR, { recursive: true, mode: 0o700 })
  }
}

export function getConfig(): Config {
  ensureDir()
  if (!fs.existsSync(CONFIG_PATH)) {
    const config: Config = { salt: generateSalt(), port: 7327 }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
    return config
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
}

export function saveConfig(config: Config) {
  ensureDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 })
}

export class VaultStore {
  private db: SqlJsDatabase | null = null
  private dbPath: string

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? DB_PATH
  }

  async init(): Promise<void> {
    ensureDir()
    const SQL = await initSqlJs()

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath)
      this.db = new SQL.Database(fileBuffer)
    } else {
      this.db = new SQL.Database()
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        issuer TEXT NOT NULL DEFAULT '',
        encrypted_secret TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_name TEXT NOT NULL,
        requester TEXT NOT NULL DEFAULT 'gui',
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    this.save()
  }

  private getDb(): SqlJsDatabase {
    if (!this.db) throw new Error('Store not initialized. Call init() first.')
    return this.db
  }

  private save() {
    const data = this.getDb().export()
    const buffer = Buffer.from(data)
    ensureDir()
    fs.writeFileSync(this.dbPath, buffer)
  }

  addAccount(name: string, issuer: string, secret: string, key: Buffer) {
    const encryptedSecret = encrypt(secret, key)
    this.getDb().run(
      'INSERT INTO accounts (name, issuer, encrypted_secret) VALUES (?, ?, ?)',
      [name, issuer, encryptedSecret]
    )
    this.save()
  }

  getAccount(name: string): StoredAccount | undefined {
    const stmt = this.getDb().prepare('SELECT * FROM accounts WHERE name = ?')
    stmt.bind([name])
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as StoredAccount
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  listAccounts(): StoredAccount[] {
    const results: StoredAccount[] = []
    const stmt = this.getDb().prepare('SELECT * FROM accounts ORDER BY name')
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredAccount)
    }
    stmt.free()
    return results
  }

  removeAccount(name: string): boolean {
    const exists = this.getAccount(name)
    if (!exists) return false
    this.getDb().run('DELETE FROM accounts WHERE name = ?', [name])
    this.save()
    return true
  }

  getDecryptedSecret(name: string, key: Buffer): string | null {
    const account = this.getAccount(name)
    if (!account) return null
    return decrypt(account.encrypted_secret, key)
  }

  logAccess(accountName: string, requester: string = 'gui') {
    this.getDb().run(
      'INSERT INTO audit_log (account_name, requester) VALUES (?, ?)',
      [accountName, requester]
    )
    this.save()
  }

  getAuditLog(limit: number = 50): AuditEntry[] {
    const results: AuditEntry[] = []
    const stmt = this.getDb().prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?')
    stmt.bind([limit])
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as AuditEntry)
    }
    stmt.free()
    return results
  }

  close() {
    if (this.db) {
      this.save()
      this.db.close()
      this.db = null
    }
  }
}

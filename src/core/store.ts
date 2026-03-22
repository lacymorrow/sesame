import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { encrypt, decrypt, deriveKey, generateSalt } from './crypto'

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
  private db: Database.Database

  constructor() {
    ensureDir()
    this.db = new Database(DB_PATH)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.init()
  }

  private init() {
    this.db.exec(`
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
  }

  addAccount(name: string, issuer: string, secret: string, key: Buffer) {
    const encryptedSecret = encrypt(secret, key)
    this.db.prepare('INSERT INTO accounts (name, issuer, encrypted_secret) VALUES (?, ?, ?)').run(
      name,
      issuer,
      encryptedSecret
    )
  }

  getAccount(name: string): StoredAccount | undefined {
    return this.db.prepare('SELECT * FROM accounts WHERE name = ?').get(name) as StoredAccount | undefined
  }

  listAccounts(): StoredAccount[] {
    return this.db.prepare('SELECT * FROM accounts ORDER BY name').all() as StoredAccount[]
  }

  removeAccount(name: string): boolean {
    const result = this.db.prepare('DELETE FROM accounts WHERE name = ?').run(name)
    return result.changes > 0
  }

  getDecryptedSecret(name: string, key: Buffer): string | null {
    const account = this.getAccount(name)
    if (!account) return null
    return decrypt(account.encrypted_secret, key)
  }

  logAccess(accountName: string, requester: string = 'gui') {
    this.db.prepare('INSERT INTO audit_log (account_name, requester) VALUES (?, ?)').run(accountName, requester)
  }

  getAuditLog(limit: number = 50): AuditEntry[] {
    return this.db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditEntry[]
  }

  close() {
    this.db.close()
  }
}

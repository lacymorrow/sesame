import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT_LENGTH = 32
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_DIGEST = 'sha512'

export function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString('hex')
}

export function deriveKey(password: string, salt: string): Buffer {
  return pbkdf2Sync(password, Buffer.from(salt, 'hex'), PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST)
}

export function encrypt(data: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string, key: Buffer): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const encrypted = Buffer.from(parts[2], 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

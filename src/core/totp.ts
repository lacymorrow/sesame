import { authenticator } from 'otplib'

export interface TotpAccount {
  name: string
  issuer: string
  secret: string
}

export function generateCode(secret: string): string {
  return authenticator.generate(secret)
}

export function verifyCode(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret })
}

export function getTimeRemaining(): number {
  const epoch = Math.floor(Date.now() / 1000)
  const step = 30
  return step - (epoch % step)
}

export function validateSecret(secret: string): boolean {
  try {
    authenticator.generate(secret)
    return true
  } catch {
    return false
  }
}

export function parseOtpauthUri(uri: string): TotpAccount {
  const url = new URL(uri)
  if (url.protocol !== 'otpauth:') throw new Error('Invalid otpauth URI')
  if (url.host !== 'totp') throw new Error('Only TOTP is supported')

  const secret = url.searchParams.get('secret')
  if (!secret) throw new Error('Missing secret in URI')

  const issuer = url.searchParams.get('issuer') ?? ''
  // Path is like /Issuer:account or /account
  const label = decodeURIComponent(url.pathname.slice(1))
  const name = label.includes(':') ? label.split(':').slice(1).join(':').trim() : label

  return { name, issuer, secret }
}

/**
 * Encryption utilities for storing sensitive HostPinnacle credentials
 *
 * ENCRYPTION_KEY is validated lazily (on first use) rather than at import
 * time so `next build` can compile routes without runtime secrets present.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables')
  }
  // Ensure key is 32 bytes (256 bits)
  cachedKey = crypto.createHash('sha256').update(secret).digest()
  return cachedKey
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

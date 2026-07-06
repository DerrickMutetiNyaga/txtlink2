/**
 * Encryption utilities for storing sensitive HostPinnacle credentials
 */

import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!
const ALGORITHM = 'aes-256-cbc'

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not set in environment variables')
}

// Ensure key is 32 bytes (256 bits)
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}


/**
 * Log sanitization helpers.
 * Customer phone numbers are PII - only ever log them masked.
 */

/** Mask a phone number for logs: keeps country code + last 2 digits (e.g. +2547*******78). */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return 'unknown'
  const raw = String(phone)
  if (raw.length <= 6) return '*'.repeat(raw.length)
  const prefixLen = raw.startsWith('+') ? 5 : 4
  return raw.slice(0, prefixLen) + '*'.repeat(Math.max(0, raw.length - prefixLen - 2)) + raw.slice(-2)
}

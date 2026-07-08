/**
 * Kenyan phone normalization for SMS fallback jobs.
 * Accepts 07..., +254..., 254..., 01..., etc.
 * Returns 2547XXXXXXXX or 2541XXXXXXXX (no + prefix).
 */

export function normalizeKenyanPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')

  if (!digits) return null

  let normalized: string

  if (digits.startsWith('0') && digits.length === 10) {
    normalized = `254${digits.substring(1)}`
  } else if (digits.startsWith('254') && digits.length === 12) {
    normalized = digits
  } else if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    normalized = `254${digits}`
  } else {
    return null
  }

  if (!/^254[17]\d{8}$/.test(normalized)) {
    return null
  }

  return normalized
}

export function formatPhoneE164(phone: string): string {
  const normalized = normalizeKenyanPhone(phone)
  if (normalized) return `+${normalized}`

  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `+254${digits.substring(1)}`
  if (digits.startsWith('254')) return `+${digits}`
  if (phone.startsWith('+')) return phone
  return `+${digits}`
}

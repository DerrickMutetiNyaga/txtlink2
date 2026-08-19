import { normalizeKenyanPhone } from '@/lib/utils/phone'

/** Legacy shared account some customers may still type. */
export const DEFAULT_PAYBILL_ACCOUNT = 'SMS'

export function normalizePaybillAccount(value?: string | null): string {
  const cleaned = (value || '').replace(/\s+/g, '').toUpperCase()
  return cleaned || DEFAULT_PAYBILL_ACCOUNT
}

export function paybillAccountDigits(value?: string | null): string {
  return (value || '').replace(/\D/g, '')
}

/**
 * M-Pesa often left-pads BillRefNumber (03992 for account 3992).
 * Look up both the raw digits and the value with leading zeros removed.
 */
export function paybillAccountLookupKeys(value?: string | null): string[] {
  const digits = paybillAccountDigits(value)
  if (!digits) return []

  const keys: string[] = []
  const add = (candidate: string) => {
    if (candidate.length >= 4 && candidate.length <= 9 && !keys.includes(candidate)) {
      keys.push(candidate)
    }
  }

  add(digits)
  const stripped = digits.replace(/^0+/, '')
  add(stripped)
  return keys
}

export function isSharedPaybillAccount(billRef?: string | null): boolean {
  const ref = (billRef || '').replace(/\s+/g, '').toUpperCase()
  return !ref || ref === DEFAULT_PAYBILL_ACCOUNT || ref === 'TXTLINK'
}

/**
 * Preferred PayBill account numbers from a Kenyan phone:
 * last 5 digits, then last 4, then last 6.
 */
export function phonePaybillCandidates(phone?: string | null): string[] {
  const normalized = normalizeKenyanPhone(phone || '')
  if (!normalized) return []

  const national = normalized.slice(-9)
  const candidates = [national.slice(-5), national.slice(-4), national.slice(-6)]
  const unique: string[] = []
  for (const candidate of candidates) {
    if (candidate && !unique.includes(candidate)) unique.push(candidate)
  }
  return unique
}

export function nextGeneratedPaybillAccount(seed: string | undefined, attempt: number): string {
  const base = paybillAccountDigits(seed)
  const parsed = base.length >= 4 ? parseInt(base, 10) : NaN
  const start = Number.isFinite(parsed) ? parsed + 1 : 10000
  return String(start + attempt)
}

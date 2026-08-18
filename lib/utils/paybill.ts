/** Shared Lipa na M-Pesa account number — same for every TXTLINK user. */
export const DEFAULT_PAYBILL_ACCOUNT = 'SMS'

export function normalizePaybillAccount(value?: string | null): string {
  const cleaned = (value || '').replace(/\s+/g, '').toUpperCase()
  return cleaned || DEFAULT_PAYBILL_ACCOUNT
}

export function isSharedPaybillAccount(
  billRef?: string | null,
  configuredAccount?: string | null
): boolean {
  const ref = (billRef || '').replace(/\s+/g, '').toUpperCase()
  if (!ref) return true
  const shared = normalizePaybillAccount(configuredAccount)
  return ref === shared || ref === DEFAULT_PAYBILL_ACCOUNT || ref === 'TXTLINK'
}

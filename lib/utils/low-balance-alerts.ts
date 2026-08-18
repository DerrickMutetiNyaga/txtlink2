/** Credit balances that trigger a one-time SMS until the user tops up above them. */
export const LOW_BALANCE_THRESHOLDS = [200, 100, 50, 10] as const

export type LowBalanceThreshold = (typeof LOW_BALANCE_THRESHOLDS)[number]

export function crossedLowBalanceThresholds(
  balance: number,
  alreadySent: number[] = []
): LowBalanceThreshold[] {
  const sent = new Set(alreadySent)
  return LOW_BALANCE_THRESHOLDS.filter((threshold) => balance < threshold && !sent.has(threshold))
}

export function remainingAlertedThresholds(balance: number, alreadySent: number[] = []): number[] {
  return alreadySent.filter((threshold) => balance < threshold)
}

export function lowestThreshold(thresholds: number[]): number | null {
  if (thresholds.length === 0) return null
  return Math.min(...thresholds)
}

export function buildLowBalanceSms(threshold: number, balance: number): string {
  const credits = Math.max(0, Math.floor(balance))
  return (
    `TXTLINK: Your SMS credits are below ${threshold}. ` +
    `Current balance: ${credits}. ` +
    `Top up at txtlink.co.ke/app/billing to keep sending.`
  )
}

// KES-only credit utilities for SMS pricing
// 1 credit = 1 SMS segment of up to 153 characters (per recipient)

export const DEFAULT_PRICE_PER_CREDIT_KES = 0.3

/**
 * Calculate how many SMS segments a message will use based on
 * the 153-characters-per-segment rule.
 */
export function calculateSegments153(message: string): number {
  const length = message ? message.length : 0
  if (length === 0) return 0
  return Math.ceil(length / 153)
}

/**
 * Total credits required for a message given recipient count.
 * 1 credit = 1 segment to 1 recipient.
 */
export function calculateRequiredCredits(
  message: string,
  recipientsCount: number
): number {
  const segments = calculateSegments153(message)
  const count = Math.max(1, recipientsCount || 1)
  return segments * count
}

/**
 * Resolve the effective per-credit price in KES.
 * For now this simply uses a global default, but you can later
 * add a per-user override and pass it into this function.
 */
export function getEffectivePricePerCreditKes(overridePriceKes?: number): number {
  return overridePriceKes && overridePriceKes > 0
    ? overridePriceKes
    : DEFAULT_PRICE_PER_CREDIT_KES
}

/**
 * Convert a paid amount in KES into integer SMS credits using a
 * KES-per-credit price. Credits are floored to avoid floating
 * point rounding issues.
 */
export function convertKesToCredits({
  paidKes,
  pricePerCreditKes,
}: {
  paidKes: number
  pricePerCreditKes: number
}): { creditsToAdd: number } {
  if (paidKes <= 0 || pricePerCreditKes <= 0) {
    return { creditsToAdd: 0 }
  }

  const rawCredits = paidKes / pricePerCreditKes
  const creditsToAdd = Math.floor(rawCredits)

  return { creditsToAdd }
}



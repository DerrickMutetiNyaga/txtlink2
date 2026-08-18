/**
 * Buying vs selling price helpers for super-admin profit tracking.
 * 1 SMS credit ≈ 1 billed SMS segment.
 */

export function roundKes(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10000) / 10000
}

export function smsCostAndProfit(params: {
  parts: number
  chargedKes: number
  buyingPriceKes: number
}): { providerCostKes: number; profitKes: number } {
  const parts = Math.max(0, Number(params.parts) || 0)
  const chargedKes = Number(params.chargedKes) || 0
  const buyingPriceKes = Math.max(0, Number(params.buyingPriceKes) || 0)
  const providerCostKes = roundKes(parts * buyingPriceKes)
  return {
    providerCostKes,
    profitKes: roundKes(chargedKes - providerCostKes),
  }
}

export function purchaseCostAndProfit(params: {
  paidKes: number
  credits: number
  buyingPriceKes: number
}): { providerCostKes: number; profitKes: number } {
  const paidKes = Number(params.paidKes) || 0
  const credits = Math.max(0, Number(params.credits) || 0)
  const buyingPriceKes = Math.max(0, Number(params.buyingPriceKes) || 0)
  const providerCostKes = roundKes(credits * buyingPriceKes)
  return {
    providerCostKes,
    profitKes: roundKes(paidKes - providerCostKes),
  }
}

export function profitPerSms(buyingPriceKes: number, sellingPriceKes: number): number {
  return roundKes((Number(sellingPriceKes) || 0) - (Number(buyingPriceKes) || 0))
}

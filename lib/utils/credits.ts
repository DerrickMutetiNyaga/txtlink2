// KES-only credit utilities for SMS pricing (client-safe — no DB imports)
// 1 credit = 1 SMS segment of up to 153 characters (per recipient)

import type { PricingRuleConfig } from '@/lib/utils/pricing-calculations'

/** Fallback when no PricingRule exists in the database. */
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
 * Map a PricingRule (global or user override) to KSh per SMS credit.
 * 1 credit ≈ 1 billed SMS unit for the chosen mode.
 */
export function pricePerCreditFromPricingRule(
  rule?: PricingRuleConfig | null
): number | null {
  if (!rule?.mode) return null

  switch (rule.mode) {
    case 'per_sms': {
      const price = Number(rule.pricePerSms)
      return Number.isFinite(price) && price > 0 ? price : null
    }
    case 'per_part': {
      const price = Number(rule.pricePerPart)
      return Number.isFinite(price) && price > 0 ? price : null
    }
    case 'per_char_block': {
      const price = Number(rule.pricePerBlock)
      return Number.isFinite(price) && price > 0 ? price : null
    }
    case 'per_character': {
      const perChar = Number(rule.pricePerCharacter)
      if (!Number.isFinite(perChar) || perChar <= 0) return null
      // 1 credit ≈ one 153-char GSM segment
      return perChar * 153
    }
    default: {
      const fallback = Number(rule.pricePerPart ?? rule.pricePerSms ?? rule.pricePerBlock)
      return Number.isFinite(fallback) && fallback > 0 ? fallback : null
    }
  }
}

/**
 * Sync helper: explicit override, else hardcoded default.
 * Prefer resolvePricePerCreditKes() on the server so Pricing Rules apply.
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

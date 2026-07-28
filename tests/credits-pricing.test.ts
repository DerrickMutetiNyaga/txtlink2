import { describe, it, expect } from 'vitest'
import {
  pricePerCreditFromPricingRule,
  convertKesToCredits,
  DEFAULT_PRICE_PER_CREDIT_KES,
} from '@/lib/utils/credits'

describe('pricePerCreditFromPricingRule', () => {
  it('uses pricePerSms for per_sms mode', () => {
    expect(
      pricePerCreditFromPricingRule({ mode: 'per_sms', pricePerSms: 0.4 })
    ).toBe(0.4)
  })

  it('uses pricePerPart for per_part mode', () => {
    expect(
      pricePerCreditFromPricingRule({ mode: 'per_part', pricePerPart: 0.35 })
    ).toBe(0.35)
  })

  it('uses pricePerBlock for per_char_block mode', () => {
    expect(
      pricePerCreditFromPricingRule({
        mode: 'per_char_block',
        pricePerBlock: 0.4,
        charsPerBlock: 100,
      })
    ).toBe(0.4)
  })

  it('returns null for missing/invalid prices', () => {
    expect(pricePerCreditFromPricingRule(null)).toBeNull()
    expect(pricePerCreditFromPricingRule({ mode: 'per_sms' })).toBeNull()
    expect(
      pricePerCreditFromPricingRule({ mode: 'per_sms', pricePerSms: 0 })
    ).toBeNull()
  })
})

describe('convertKesToCredits with 0.4 rate', () => {
  it('converts KSh 40 to 100 credits at 0.4', () => {
    expect(
      convertKesToCredits({ paidKes: 40, pricePerCreditKes: 0.4 }).creditsToAdd
    ).toBe(100)
  })

  it('falls back default is still 0.3 for callers that need it', () => {
    expect(DEFAULT_PRICE_PER_CREDIT_KES).toBe(0.3)
  })
})

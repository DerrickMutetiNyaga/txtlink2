import { describe, it, expect } from 'vitest'
import { purchaseCostAndProfit, smsCostAndProfit, profitPerSms, roundKes } from '@/lib/utils/cost-profit'

describe('smsCostAndProfit', () => {
  it('computes provider cost and profit from buying price', () => {
    expect(smsCostAndProfit({ parts: 10, chargedKes: 5, buyingPriceKes: 0.3 })).toEqual({
      providerCostKes: 3,
      profitKes: 2,
    })
  })

  it('allows negative profit when selling below cost', () => {
    expect(smsCostAndProfit({ parts: 2, chargedKes: 0.4, buyingPriceKes: 0.3 })).toEqual({
      providerCostKes: 0.6,
      profitKes: -0.2,
    })
  })
})

describe('purchaseCostAndProfit', () => {
  it('uses paid amount minus credits times buying price', () => {
    expect(purchaseCostAndProfit({ paidKes: 1000, credits: 2000, buyingPriceKes: 0.3 })).toEqual({
      providerCostKes: 600,
      profitKes: 400,
    })
  })
})

describe('profitPerSms', () => {
  it('is selling minus buying', () => {
    expect(profitPerSms(0.3, 0.5)).toBe(0.2)
  })
})

describe('roundKes', () => {
  it('rounds to 4 decimal places', () => {
    expect(roundKes(0.1 + 0.2)).toBe(0.3)
  })
})

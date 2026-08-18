import { describe, it, expect } from 'vitest'
import {
  crossedLowBalanceThresholds,
  remainingAlertedThresholds,
  lowestThreshold,
  buildLowBalanceSms,
} from '@/lib/utils/low-balance-alerts'

describe('crossedLowBalanceThresholds', () => {
  it('does not alert at exactly 200', () => {
    expect(crossedLowBalanceThresholds(200)).toEqual([])
  })

  it('alerts at 199 for the 200 threshold', () => {
    expect(crossedLowBalanceThresholds(199)).toEqual([200])
  })

  it('returns every newly crossed level when balance jumps', () => {
    expect(crossedLowBalanceThresholds(5)).toEqual([200, 100, 50, 10])
  })

  it('skips thresholds already sent', () => {
    expect(crossedLowBalanceThresholds(40, [200, 100])).toEqual([50])
  })
})

describe('remainingAlertedThresholds', () => {
  it('clears alerts once the balance is no longer below that level', () => {
    expect(remainingAlertedThresholds(150, [200, 100, 50])).toEqual([200])
  })

  it('clears everything after a full top-up', () => {
    expect(remainingAlertedThresholds(500, [200, 100, 50, 10])).toEqual([])
  })
})

describe('lowestThreshold', () => {
  it('picks the most urgent crossed level', () => {
    expect(lowestThreshold([200, 100, 50])).toBe(50)
  })
})

describe('buildLowBalanceSms', () => {
  it('includes the threshold, balance, and top-up link', () => {
    const text = buildLowBalanceSms(50, 41)
    expect(text).toContain('below 50')
    expect(text).toContain('41')
    expect(text).toContain('txtlink.co.ke/app/billing')
  })
})

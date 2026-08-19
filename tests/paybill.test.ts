import { describe, it, expect } from 'vitest'
import { kenyanPhoneVariants, normalizeKenyanPhone } from '@/lib/utils/phone'
import {
  isSharedPaybillAccount,
  nextGeneratedPaybillAccount,
  phonePaybillCandidates,
  paybillAccountDigits,
} from '@/lib/utils/paybill'

describe('paybill account from phone', () => {
  it('uses last 5 digits, then last 4, then last 6', () => {
    expect(phonePaybillCandidates('0712345678')).toEqual(['45678', '5678', '345678'])
    expect(phonePaybillCandidates('254712345678')).toEqual(['45678', '5678', '345678'])
    expect(phonePaybillCandidates('+254712345678')).toEqual(['45678', '5678', '345678'])
  })

  it('returns no candidates for an empty phone', () => {
    expect(phonePaybillCandidates('')).toEqual([])
    expect(phonePaybillCandidates(null)).toEqual([])
  })

  it('generates the next unused number after a collision', () => {
    expect(nextGeneratedPaybillAccount('45678', 0)).toBe('45679')
    expect(nextGeneratedPaybillAccount('45678', 1)).toBe('45680')
    expect(nextGeneratedPaybillAccount('', 0)).toBe('10000')
  })

  it('strips account references to digits for matching', () => {
    expect(paybillAccountDigits(' 45 678 ')).toBe('45678')
  })

  it('still treats SMS/TXTLINK as a legacy shared account', () => {
    expect(isSharedPaybillAccount('SMS')).toBe(true)
    expect(isSharedPaybillAccount('sms')).toBe(true)
    expect(isSharedPaybillAccount('')).toBe(true)
    expect(isSharedPaybillAccount('45678')).toBe(false)
  })
})

describe('kenyanPhoneVariants', () => {
  it('covers registration and M-Pesa MSISDN formats', () => {
    const variants = kenyanPhoneVariants('254712345678')
    expect(variants).toEqual(expect.arrayContaining(['254712345678', '+254712345678', '0712345678']))
    expect(normalizeKenyanPhone('0712345678')).toBe('254712345678')
    expect(normalizeKenyanPhone('+254712345678')).toBe('254712345678')
  })
})

import { describe, it, expect } from 'vitest'
import { kenyanPhoneVariants, normalizeKenyanPhone } from '@/lib/utils/phone'
import {
  isSharedPaybillAccount,
  isUsablePaybillAccount,
  nextGeneratedPaybillAccount,
  phonePaybillCandidates,
  paybillAccountDigits,
  paybillAccountLookupKeys,
} from '@/lib/utils/paybill'

describe('paybill account from phone', () => {
  it('uses last 5 digits, then last 4, then last 6', () => {
    expect(phonePaybillCandidates('0712345678')).toEqual(['45678', '5678', '345678'])
    expect(phonePaybillCandidates('254712345678')).toEqual(['45678', '5678', '345678'])
    expect(phonePaybillCandidates('+254712345678')).toEqual(['45678', '5678', '345678'])
  })

  it('skips phone digits that start or end with 0', () => {
    expect(phonePaybillCandidates('0712304567')).toEqual(['4567', '304567'])
    expect(phonePaybillCandidates('0712345670')).toEqual([])
    expect(isUsablePaybillAccount('03992')).toBe(false)
    expect(isUsablePaybillAccount('39920')).toBe(false)
    expect(isUsablePaybillAccount('3992')).toBe(true)
  })

  it('returns no candidates for an empty phone', () => {
    expect(phonePaybillCandidates('')).toEqual([])
    expect(phonePaybillCandidates(null)).toEqual([])
  })

  it('generates the next unused number after a collision, skipping 0 start/end', () => {
    expect(nextGeneratedPaybillAccount('45678', 0)).toBe('45679')
    expect(nextGeneratedPaybillAccount('45678', 1)).toBe('45681')
    expect(nextGeneratedPaybillAccount('', 0)).toBe('10001')
  })

  it('strips account references to digits for matching', () => {
    expect(paybillAccountDigits(' 45 678 ')).toBe('45678')
  })

  it('matches M-Pesa zero-padded account numbers', () => {
    expect(paybillAccountLookupKeys('03992')).toEqual(['03992', '3992'])
    expect(paybillAccountLookupKeys('3992')).toEqual(['3992'])
    expect(paybillAccountLookupKeys('30992')).toEqual(['30992'])
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

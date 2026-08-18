import { describe, it, expect } from 'vitest'
import { kenyanPhoneVariants, normalizeKenyanPhone } from '@/lib/utils/phone'
import { isSharedPaybillAccount, normalizePaybillAccount } from '@/lib/utils/paybill'

describe('paybill account', () => {
  it('defaults to SMS and is the same for every user', () => {
    expect(normalizePaybillAccount('')).toBe('SMS')
    expect(normalizePaybillAccount(' sms ')).toBe('SMS')
  })

  it('treats empty or SMS/TXTLINK as the shared account', () => {
    expect(isSharedPaybillAccount('SMS', 'SMS')).toBe(true)
    expect(isSharedPaybillAccount('sms', 'SMS')).toBe(true)
    expect(isSharedPaybillAccount('', 'SMS')).toBe(true)
    expect(isSharedPaybillAccount('USER-698acd4349426058ffa16b94', 'SMS')).toBe(false)
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

import { describe, it, expect } from 'vitest'
import { canonicalMpesaCallbackUrl } from '@/lib/utils/mpesa-callback-url'

describe('canonicalMpesaCallbackUrl', () => {
  it('strips www from txtlink.co.ke callback URLs', () => {
    expect(canonicalMpesaCallbackUrl('https://www.txtlink.co.ke/api/c2b-confirmation')).toBe(
      'https://txtlink.co.ke/api/c2b-confirmation'
    )
    expect(canonicalMpesaCallbackUrl('https://www.txtlink.co.ke/api/c2b-validation/')).toBe(
      'https://txtlink.co.ke/api/c2b-validation'
    )
    expect(canonicalMpesaCallbackUrl('https://www.txtlink.co.ke/api/mpesa/stk-callback')).toBe(
      'https://txtlink.co.ke/api/mpesa/stk-callback'
    )
  })

  it('leaves the apex domain unchanged', () => {
    expect(canonicalMpesaCallbackUrl('https://txtlink.co.ke/api/c2b-confirmation')).toBe(
      'https://txtlink.co.ke/api/c2b-confirmation'
    )
  })

  it('returns empty for missing values', () => {
    expect(canonicalMpesaCallbackUrl('')).toBe('')
    expect(canonicalMpesaCallbackUrl(null)).toBe('')
  })
})

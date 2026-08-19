import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import { buildActionableSmsFilter } from '@/lib/services/sms-history/actionable'
import { getDisplayStatus } from '@/lib/services/sms-history/format'
import type { ISmsMessage } from '@/lib/db/models'

describe('pending & failed desk filter', () => {
  const userId = new mongoose.Types.ObjectId()

  it('excludes phone-delivered and phone-sent messages', () => {
    const pending = buildActionableSmsFilter(userId, 'pending') as {
      fallbackStatus: { $nin: string[] }
      status: { $ne: string }
    }
    const all = buildActionableSmsFilter(userId, 'all') as {
      fallbackStatus: { $nin: string[] }
    }

    expect(pending.status.$ne).toBe('delivered')
    expect(pending.fallbackStatus.$nin).toEqual(
      expect.arrayContaining(['delivered_via_phone', 'sent_via_phone'])
    )
    expect(all.fallbackStatus.$nin).toEqual(
      expect.arrayContaining(['delivered_via_phone', 'sent_via_phone'])
    )
  })
})

describe('getDisplayStatus', () => {
  it('does not label sent-via-phone as delivered', () => {
    expect(
      getDisplayStatus({
        status: 'sent',
        fallbackStatus: 'sent_via_phone',
        deliveryMethod: 'android_phone_gateway',
      } as ISmsMessage)
    ).toBe('Sent via Phone')
  })

  it('labels confirmed phone delivery as delivered via phone', () => {
    expect(
      getDisplayStatus({
        status: 'delivered',
        fallbackStatus: 'delivered_via_phone',
        deliveryMethod: 'android_phone_gateway',
      } as ISmsMessage)
    ).toBe('Delivered via Phone')
  })
})

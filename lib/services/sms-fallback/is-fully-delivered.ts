/**
 * True only when an SMS was actually confirmed delivered — not merely queued
 * to the Android phone gateway (deliveryMethod is set at queue time).
 */

import type { ISmsMessage } from '@/lib/db/models'
import { isPhoneDeliveredFallbackStatus } from './phone-status'
import { isSmsDelivered } from './status-normalize'

type SmsDeliveryFields = Pick<
  ISmsMessage,
  'status' | 'deliveryStatus' | 'deliveryMethod' | 'fallbackStatus' | 'deliveredAt' | 'providerRetryDeliveredAt'
>

/** Confirmed handset/provider delivery (safe to cancel phone jobs). */
export function isSmsFullyDelivered(sms: SmsDeliveryFields): boolean {
  if (isPhoneDeliveredFallbackStatus(sms.fallbackStatus)) return true
  if (sms.status === 'delivered') return true
  if (isSmsDelivered(sms as ISmsMessage)) return true
  return false
}

/** Queued for phone but not yet confirmed delivered via phone. */
export function isAwaitingPhoneDelivery(sms: SmsDeliveryFields): boolean {
  if (isSmsFullyDelivered(sms)) return false
  if (sms.fallbackStatus === 'phone_failed' || sms.fallbackStatus === 'phone_requires_topup') {
    return false
  }
  return (
    sms.deliveryMethod === 'android_phone_gateway' ||
    sms.fallbackStatus === 'queued_for_phone' ||
    sms.fallbackStatus === 'sending_via_phone'
  )
}

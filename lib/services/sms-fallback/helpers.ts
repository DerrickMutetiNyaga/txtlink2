import mongoose from 'mongoose'
import { ISmsMessage, SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { FALLBACK_PHONE_STATUSES } from './config'
import { isPhoneDeliveredFallbackStatus } from './phone-status'
import { isSmsDelivered } from './status-normalize'
import { isSmsFullyDelivered } from './is-fully-delivered'

export function shouldSkipProviderRetry(sms: ISmsMessage): boolean {
  if (sms.providerRetryAttempted === true) return true
  if (isSmsFullyDelivered(sms)) return true
  return false
}

export function shouldSkipFallbackProcessing(sms: ISmsMessage): boolean {
  // Already confirmed delivered — no phone fallback needed
  if (isSmsFullyDelivered(sms)) return true
  if (sms.fallbackStatus === 'phone_requires_topup') return true
  // Already claimed/queued for phone (not the same as delivered)
  if (sms.fallbackQueued === true) return true
  if (
    sms.fallbackStatus &&
    (FALLBACK_PHONE_STATUSES as readonly string[]).includes(sms.fallbackStatus)
  ) {
    return true
  }
  return false
}

export async function cancelFallbackJobIfDelivered(
  originalSmsId: string,
  reason = 'Original or retry SMS was delivered'
): Promise<boolean> {
  const sms = await SmsMessage.findById(originalSmsId).lean()
  if (!sms) return false

  // Only act when delivery is confirmed — deliveryMethod=android_phone_gateway
  // is set at queue time for force-phone routing and must NOT count as delivered.
  if (!isSmsFullyDelivered(sms)) return false

  const job = await SmsFallbackJob.findOne({ originalSmsId })
  if (!job) return false

  if (['delivered', 'sent', 'cancelled'].includes(job.status)) return false

  if (isPhoneDeliveredFallbackStatus(sms.fallbackStatus) || sms.status === 'delivered') {
    const deliveredAt = sms.fallbackDeliveredAt || sms.fallbackSentAt || sms.deliveredAt || new Date()
    if (
      sms.deliveryMethod === 'android_phone_gateway' ||
      isPhoneDeliveredFallbackStatus(sms.fallbackStatus)
    ) {
      job.status = 'delivered'
      job.phoneStatus = 'delivered'
      job.deliveredAt = deliveredAt
      job.sentAt = job.sentAt || deliveredAt
      await job.save()
      return true
    }
  }

  job.status = 'cancelled'
  job.phoneStatus = 'cancelled'
  job.cancelReason = reason
  await job.save()

  await SmsMessage.findByIdAndUpdate(originalSmsId, {
    fallbackStatus: 'cancelled',
  })

  return true
}

export function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

export function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
}

// Re-export for convenience
export { isSmsDelivered, isSmsFullyDelivered }

import mongoose from 'mongoose'
import { ISmsMessage, SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { FALLBACK_PHONE_STATUSES } from './config'

export function shouldSkipFallbackProcessing(sms: ISmsMessage): boolean {
  if (sms.status === 'delivered') return true
  if (sms.deliveryMethod === 'android_phone_gateway') return true
  if (sms.fallbackStatus === 'sent_via_phone') return true
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

  const isDelivered =
    sms.status === 'delivered' ||
    sms.providerRetryStatus === 'delivered' ||
    sms.fallbackStatus === 'sent_via_phone'

  if (!isDelivered) return false

  const job = await SmsFallbackJob.findOne({ originalSmsId })
  if (!job) return false

  if (['sent', 'cancelled'].includes(job.status)) return false

  if (
    sms.fallbackStatus === 'sent_via_phone' ||
    sms.deliveryMethod === 'android_phone_gateway'
  ) {
    job.status = 'sent'
    job.sentAt = sms.fallbackSentAt || sms.deliveredAt || new Date()
    await job.save()
    return true
  }

  job.status = 'cancelled'
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

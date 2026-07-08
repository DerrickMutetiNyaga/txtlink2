/**
 * Create or update phone fallback job with validated real SMS body.
 */
import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, ISmsMessage, ISmsFallbackJob } from '@/lib/db/models'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import {
  logFallbackJobMessageDebug,
  resolveFallbackMessageForSms,
  validateFallbackMessageBody,
  buildMetadataFromSms,
} from '@/lib/services/sms/message-body'

export interface CreateFallbackJobResult {
  ok: boolean
  jobId?: string
  error?: string
}

export async function createOrUpdatePhoneFallbackJob(
  sms: ISmsMessage & { _id: unknown },
  options?: { resetExisting?: boolean }
): Promise<CreateFallbackJobResult> {
  await connectDB()

  const phone = sms.toNumbers[0] || ''
  const normalized = sms.normalizedPhone || normalizeKenyanPhone(phone)
  if (!normalized) {
    return { ok: false, error: 'Invalid phone number' }
  }

  const resolved = resolveFallbackMessageForSms(sms)
  if (!resolved) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      fallbackStatus: 'fallback_error_missing_message_body',
      fallbackFailureReason: 'Could not resolve valid SMS message body for phone fallback',
    })
    return { ok: false, error: 'Missing or invalid message body' }
  }

  const metadata = buildMetadataFromSms(sms)

  try {
    validateFallbackMessageBody(resolved.body, metadata)
  } catch (err: any) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      fallbackStatus: 'fallback_error_missing_message_body',
      fallbackFailureReason: err.message,
    })
    console.error('Phone fallback job rejected — invalid message body', {
      originalSmsId: String(sms._id),
      error: err.message,
    })
    return { ok: false, error: err.message }
  }

  logFallbackJobMessageDebug({
    originalSmsId: String(sms._id),
    source: sms.source,
    authMethod: sms.authMethod,
    apiKeyName: sms.apiKeyName,
    clientUsername: sms.clientUsername,
    clientName: sms.clientName,
    message: resolved.body,
    usedFieldName: resolved.usedField,
  })

  const originalSmsId = String(sms._id)
  const now = new Date()
  const jobPayload = {
    status: 'pending' as const,
    phoneStatus: 'pending' as const,
    recipientPhone: phone,
    normalizedPhone: normalized,
    message: resolved.body,
    originalStatus: sms.status,
    originalProviderMessageId: sms.hpTransactionId,
    originalSentAt: sms.sentAt,
    originalFailureReason: sms.deliveryCause || sms.errorMessage,
    source: sms.source,
    authMethod: sms.authMethod,
    apiKeyId: sms.apiKeyId,
    apiKeyName: sms.apiKeyName,
    clientId: sms.clientId,
    clientUsername: sms.clientUsername,
    clientName: sms.clientName,
  }

  const existing = await SmsFallbackJob.findOne({ originalSmsId }).lean()
  if (
    existing &&
    ['pending', 'sending', 'delivered', 'sent'].includes(existing.status) &&
    !options?.resetExisting
  ) {
    return { ok: false, error: 'Fallback job already active' }
  }

  const job = existing
    ? await SmsFallbackJob.findOneAndUpdate({ originalSmsId }, { $set: jobPayload }, { new: true })
    : await SmsFallbackJob.create({
        userId: sms.userId,
        originalSmsId,
        ...jobPayload,
        retryAttempted: sms.providerRetryAttempted || false,
        retryAttemptedAt: sms.providerRetryAttemptedAt,
        retryProviderMessageId: sms.providerRetrySmsId,
        retryStatus: sms.providerRetryStatus as ISmsFallbackJob['retryStatus'],
        retrySentAt: sms.providerRetrySentAt,
        retryFailedAt: sms.providerRetryFailedAt,
        retryFailureReason: sms.providerRetryFailureReason,
        attempts: 0,
      })

  if (!job) return { ok: false, error: 'Failed to create fallback job' }

  await SmsMessage.findByIdAndUpdate(sms._id, {
    fallbackQueued: true,
    fallbackStatus: 'queued_for_phone',
    fallbackQueuedAt: now,
    fallbackJobId: String(job._id),
  })

  return { ok: true, jobId: String(job._id) }
}

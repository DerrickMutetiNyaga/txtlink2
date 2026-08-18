/**
 * One-shot recovery: resend SMS that failed because HostPinnacle returned
 * HTML 502/503/504 ("No server is available…") instead of JSON.
 *
 * Safe under concurrent workers via atomic claim on providerOutageResendAt.
 */
import connectDB from '@/lib/db/connect'
import { SmsMessage, User, type ISmsMessage } from '@/lib/db/models'
import { resolveHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import { hostPinnacleClient, isTransientProviderFailure } from '@/lib/services/hostpinnacle/client'
import {
  extractHostPinnacleSendIds,
  primaryStatusLookupId,
} from '@/lib/services/hostpinnacle/send-ids'
import { postSendStatusFields } from '@/lib/services/sms-status/auto-delivered'
import { resolveSmsMessageBody } from '@/lib/services/sms/message-body'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import { maskPhone } from '@/lib/utils/log-sanitize'
import { queueLowBalanceAlertSync } from '@/lib/services/sms/low-balance-alert'

export const PROVIDER_OUTAGE_ERROR_REGEX =
  /503\s*Service Unavailable|No server is available to handle this request|HostPinnacle temporarily unavailable \(HTTP 50[234]\)|Invalid response:[\s\S]*<(?:html|body|h1)/i

export type ProviderOutageResendResult = {
  claimed: number
  resent: number
  failed: number
  skippedNoCredits: number
  skippedNoBody: number
  skippedNoCreds: number
}

function requiredCredits(sms: Pick<ISmsMessage, 'segments' | 'toNumbers'>): number {
  const recipients = Array.isArray(sms.toNumbers) && sms.toNumbers.length > 0 ? sms.toNumbers.length : 1
  const segments = sms.segments > 0 ? sms.segments : 1
  return segments * recipients
}

async function claimNextOutageFailure(): Promise<(ISmsMessage & { _id: unknown }) | null> {
  const doc = await SmsMessage.findOneAndUpdate(
    {
      status: 'failed',
      providerOutageResendAt: { $exists: false },
      $or: [
        { errorMessage: PROVIDER_OUTAGE_ERROR_REGEX },
        { deliveryCause: PROVIDER_OUTAGE_ERROR_REGEX },
        { errorCode: 'HP_API_ERROR', errorMessage: /Invalid response|503|502|504|temporarily unavailable/i },
      ],
    },
    {
      $set: {
        providerOutageResendAt: new Date(),
        status: 'queued',
      },
      $unset: {
        errorCode: 1,
        errorMessage: 1,
        failedAt: 1,
        finalizedAt: 1,
      },
    },
    { new: true, sort: { createdAt: 1 } }
  ).lean()

  return doc as (ISmsMessage & { _id: unknown }) | null
}

async function reDeductIfRefunded(
  sms: ISmsMessage & { _id: unknown }
): Promise<{ ok: boolean; reason?: string }> {
  if (!sms.refunded) {
    return { ok: true }
  }

  const credits = requiredCredits(sms)
  const updated = await User.findOneAndUpdate(
    { _id: sms.userId, creditsBalance: { $gte: credits } },
    { $inc: { creditsBalance: -credits } },
    { new: true }
  )

  if (!updated) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      status: 'failed',
      errorCode: 'INSUFFICIENT_CREDITS',
      errorMessage: 'Auto-resend skipped: insufficient credits after provider outage',
      failedAt: new Date(),
      finalizedAt: new Date(),
      nextCheckAt: null,
    })
    return { ok: false, reason: 'insufficient_credits' }
  }

  await SmsMessage.findByIdAndUpdate(sms._id, {
    refunded: false,
    creditDeducted: true,
  })

  queueLowBalanceAlertSync(sms.userId, updated.creditsBalance || 0)

  return { ok: true }
}

async function resendOne(sms: ISmsMessage & { _id: unknown }): Promise<'resent' | 'failed' | 'skipped_body' | 'skipped_creds'> {
  const resolved = resolveSmsMessageBody(sms)
  if (!resolved?.body) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      status: 'failed',
      errorCode: 'MISSING_BODY',
      errorMessage: 'Auto-resend skipped: missing SMS body',
      failedAt: new Date(),
      finalizedAt: new Date(),
      nextCheckAt: null,
    })
    return 'skipped_body'
  }

  const phone = sms.toNumbers?.[0]
  const normalized = phone ? normalizeKenyanPhone(phone) : null
  if (!normalized) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      status: 'failed',
      errorCode: 'INVALID_PHONE_NUMBER',
      errorMessage: 'Auto-resend skipped: invalid phone number',
      failedAt: new Date(),
      finalizedAt: new Date(),
      nextCheckAt: null,
    })
    return 'failed'
  }

  const hpCreds = await resolveHostPinnacleCredentials(sms.userId)
  if (!hpCreds) {
    await SmsMessage.findByIdAndUpdate(sms._id, {
      status: 'failed',
      errorCode: 'HP_NOT_CONFIGURED',
      errorMessage: 'Auto-resend skipped: HostPinnacle not configured',
      failedAt: new Date(),
      finalizedAt: new Date(),
      nextCheckAt: null,
    })
    return 'skipped_creds'
  }

  const wasRefunded = Boolean(sms.refunded)
  const credit = await reDeductIfRefunded(sms)
  if (!credit.ok) {
    return 'failed'
  }
  const chargedThisAttempt = wasRefunded

  console.log('[provider-outage-resend] sending', {
    smsId: String(sms._id),
    phone: maskPhone(normalized),
    senderid: sms.senderName,
  })

  const hpResult = await hostPinnacleClient.sendSms({
    mobile: normalized,
    msg: resolved.body,
    senderid: sms.senderName,
    options: {
      apiKey: hpCreds.apiKey,
      userId: hpCreds.userId,
      password: hpCreds.password,
    },
    retries: 4,
  })

  if (!hpResult.success) {
    const errorMsg = hpResult.error || hpResult.message || 'HostPinnacle resend failed'
    const credits = requiredCredits(sms)

    // Refund only if this attempt held credits (re-deducted, or original never refunded)
    if (chargedThisAttempt || !wasRefunded) {
      await User.findByIdAndUpdate(sms.userId, { $inc: { creditsBalance: credits } })
      queueLowBalanceAlertSync(sms.userId)
    }

    const stillTransient = isTransientProviderFailure(hpResult)
    await SmsMessage.findByIdAndUpdate(sms._id, {
      status: 'failed',
      errorCode: 'HP_API_ERROR',
      errorMessage: errorMsg,
      failedAt: new Date(),
      finalizedAt: new Date(),
      nextCheckAt: null,
      refunded: true,
    })

    if (stillTransient) {
      await SmsMessage.findByIdAndUpdate(sms._id, { $unset: { providerOutageResendAt: 1 } })
    }

    return 'failed'
  }

  const hpIds = extractHostPinnacleSendIds(hpResult.data)
  const statusLookupId = primaryStatusLookupId(hpIds)

  // 'sent' + polling schedule, or final 'delivered' when the super-admin
  // auto-mark-delivered toggle is on (statusFields spread last so it wins).
  const statusFields = await postSendStatusFields()

  await SmsMessage.findByIdAndUpdate(sms._id, {
    externalMsgId: hpIds.messageId || statusLookupId,
    hpTransactionId: hpIds.transactionId || statusLookupId,
    deliveryStatus: 'sent',
    lastCheckedAt: null,
    statusCheckAttempts: 0,
    finalizedAt: null,
    failedAt: undefined,
    errorCode: undefined,
    errorMessage: undefined,
    refunded: false,
    creditDeducted: true,
    ...statusFields,
  })

  return 'resent'
}

/**
 * Drain failed outage SMS (default: up to 100 per invoke).
 * Call on deploy startup and from the fallback scan cron.
 */
export async function resendProviderOutageFailures(
  limit = 100
): Promise<ProviderOutageResendResult> {
  await connectDB()

  const result: ProviderOutageResendResult = {
    claimed: 0,
    resent: 0,
    failed: 0,
    skippedNoCredits: 0,
    skippedNoBody: 0,
    skippedNoCreds: 0,
  }

  for (let i = 0; i < limit; i++) {
    const sms = await claimNextOutageFailure()
    if (!sms) break

    result.claimed++
    try {
      const outcome = await resendOne(sms)
      if (outcome === 'resent') result.resent++
      else if (outcome === 'skipped_body') result.skippedNoBody++
      else if (outcome === 'skipped_creds') result.skippedNoCreds++
      else {
        // Check if it was credit skip (error already set on doc)
        const latest = await SmsMessage.findById(sms._id).select('errorCode').lean()
        if (latest?.errorCode === 'INSUFFICIENT_CREDITS') result.skippedNoCredits++
        else result.failed++
      }
    } catch (err) {
      result.failed++
      console.error('[provider-outage-resend] unexpected error', {
        smsId: String(sms._id),
        err: err instanceof Error ? err.message : String(err),
      })
      await SmsMessage.findByIdAndUpdate(sms._id, {
        status: 'failed',
        errorCode: 'AUTO_RESEND_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Auto-resend crashed',
        failedAt: new Date(),
        finalizedAt: new Date(),
        nextCheckAt: null,
      }).catch(() => undefined)
    }

    // Small pacing so we don't stampede HostPinnacle right after an outage
    await new Promise((r) => setTimeout(r, 250))
  }

  if (result.claimed > 0) {
    console.log('[provider-outage-resend] batch complete', result)
  }

  return result
}

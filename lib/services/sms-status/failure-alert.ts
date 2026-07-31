/**
 * SMS alerts to the super-admin phone when HostPinnacle reports a delivery failure.
 * Number is configured in System Settings → Failure alert phone.
 */

import { SenderId, SystemSettings } from '@/lib/db/models'
import * as hostPinnacleClient from '@/lib/services/hostpinnacle/client'
import { SmsMessage } from '@/lib/db/models'
import mongoose from 'mongoose'

const CACHE_TTL_MS = 10_000
const MAX_ALERTS_PER_MINUTE = 8
const WINDOW_MS = 60_000

let phoneCache: { value: string | null; expiresAt: number } | null = null
const recentAlertTimestamps: number[] = []
let suppressedSinceLastSummary = 0
let summaryPending = false

export function clearFailureAlertPhoneCache(): void {
  phoneCache = null
}

async function getFailureAlertPhone(): Promise<string | null> {
  const now = Date.now()
  if (phoneCache && phoneCache.expiresAt > now) return phoneCache.value

  try {
    const settings = await SystemSettings.findOne().select('failureAlertPhone').lean()
    const raw = (settings?.failureAlertPhone || '').trim()
    const value = raw.length >= 9 ? raw : null
    phoneCache = { value, expiresAt: now + CACHE_TTL_MS }
    return value
  } catch {
    return null
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

async function resolveAlertSenderId(): Promise<string> {
  try {
    const settings = await SystemSettings.findOne()
      .select('platformName signupDefaultSenderId')
      .populate('signupDefaultSenderId', 'senderName status')
      .lean()

    const populated = settings?.signupDefaultSenderId as
      | { senderName?: string; status?: string }
      | null
      | undefined
    if (populated?.senderName && populated.status === 'approved') {
      return populated.senderName
    }

    const approved = await SenderId.findOne({ status: 'approved' })
      .select('senderName')
      .sort({ updatedAt: -1 })
      .lean()
    if (approved?.senderName) return approved.senderName

    const name = (settings?.platformName || 'TXTLINK').replace(/\s+/g, '').slice(0, 11)
    return name || 'TXTLINK'
  } catch {
    return 'TXTLINK'
  }
}

function trimRecent(now: number): void {
  while (recentAlertTimestamps.length > 0 && now - recentAlertTimestamps[0] > WINDOW_MS) {
    recentAlertTimestamps.shift()
  }
}

async function sendAlertSms(to: string, body: string): Promise<void> {
  const senderid = await resolveAlertSenderId()
  const result = await hostPinnacleClient.sendSms({
    mobile: to,
    msg: body.slice(0, 320),
    senderid,
    retries: 1,
  })
  if (!result.success) {
    console.error('[failure-alert] SMS send failed:', result.error || result)
  }
}

/**
 * Notify the configured super-admin phone that a message failed delivery.
 * Safe to call fire-and-forget; never throws to the status pipeline.
 */
export async function notifyDeliveryFailureAlert(params: {
  messageId: mongoose.Types.ObjectId | string
  status: string
  toNumbers?: string[]
  senderName?: string
  cause?: string
  previousStatus?: string
  source?: string
}): Promise<void> {
  try {
    if (params.source === 'system') return

    const alertPhone = await getFailureAlertPhone()
    if (!alertPhone) return

    const to = params.toNumbers?.[0]
    if (to && normalizePhone(to) === normalizePhone(alertPhone)) {
      // Avoid alert loops if the failed message was itself an alert SMS.
      return
    }

    const marked = await SmsMessage.findOneAndUpdate(
      {
        _id: params.messageId,
        $or: [{ failureAlertSentAt: null }, { failureAlertSentAt: { $exists: false } }],
      },
      { $set: { failureAlertSentAt: new Date() } },
      { new: false }
    ).lean()
    if (!marked) return

    const now = Date.now()
    trimRecent(now)
    if (recentAlertTimestamps.length >= MAX_ALERTS_PER_MINUTE) {
      suppressedSinceLastSummary += 1
      if (!summaryPending) {
        summaryPending = true
        setTimeout(() => {
          void (async () => {
            const n = suppressedSinceLastSummary
            suppressedSinceLastSummary = 0
            summaryPending = false
            if (n <= 0) return
            const phone = await getFailureAlertPhone()
            if (!phone) return
            await sendAlertSms(
              phone,
              `TXTLINK: ${n} more SMS delivery failure(s) in the last minute. Check SMS History / HostPinnacle.`
            )
          })()
        }, WINDOW_MS)
      }
      return
    }

    recentAlertTimestamps.push(now)

    const dest = to || 'unknown'
    const cause = (params.cause || params.status || 'FAILED').slice(0, 80)
    const overridden =
      params.previousStatus === 'delivered'
        ? ' (was shown as Delivered — HostPinnacle later reported failure)'
        : ''

    const body =
      `TXTLINK ALERT: SMS failed${overridden}. ` +
      `To: ${dest}. Sender: ${params.senderName || '-'}. ` +
      `Status: ${params.status}. Cause: ${cause}. ` +
      `Id: ${String(params.messageId).slice(-8)}`

    await sendAlertSms(alertPhone, body)
  } catch (error) {
    console.error('[failure-alert] unexpected error:', error)
  }
}

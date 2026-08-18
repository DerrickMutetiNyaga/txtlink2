/**
 * SMS the user's profile phone when their credit balance drops below
 * 200, 100, 50, then 10. Uses their own Sender ID and deducts credits.
 */

import mongoose from 'mongoose'
import { SmsMessage, User, UserSenderId } from '@/lib/db/models'
import * as hostPinnacleClient from '@/lib/services/hostpinnacle/client'
import { resolveHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import { extractHostPinnacleSendIds, primaryStatusLookupId } from '@/lib/services/hostpinnacle/send-ids'
import { smsProfitFields } from '@/lib/services/profit'
import { buildMessageBodyFields } from '@/lib/services/sms/message-body'
import { postSendStatusFields } from '@/lib/services/sms-status/auto-delivered'
import { initialNextCheckAt } from '@/lib/services/sms-status/build-synchronizer'
import { schedulePostSendStatusSync } from '@/lib/services/sms-status/sync-user-pending'
import { calculateRequiredCredits, calculateSegments153 } from '@/lib/utils/credits'
import { formatPhoneE164 } from '@/lib/utils/phone'
import { resolvePricePerCreditKes } from '@/lib/utils/resolve-price-per-credit'
import {
  crossedLowBalanceThresholds,
  lowestThreshold,
  remainingAlertedThresholds,
  buildLowBalanceSms,
} from '@/lib/utils/low-balance-alerts'

type UserId = string | mongoose.Types.ObjectId

function toObjectId(userId: UserId): mongoose.Types.ObjectId {
  return userId instanceof mongoose.Types.ObjectId
    ? userId
    : new mongoose.Types.ObjectId(String(userId))
}

async function resolveUserSenderName(userId: mongoose.Types.ObjectId): Promise<string | null> {
  const links = await UserSenderId.find({ userId })
    .populate('senderId', 'senderName status')
    .sort({ isDefault: -1, createdAt: 1 })
    .lean()

  for (const link of links) {
    const sender = link.senderId as unknown as { senderName?: string; status?: string } | null
    if (sender?.senderName && (sender.status === 'active' || sender.status === 'approved')) {
      return sender.senderName
    }
  }

  return null
}

function normalizeAlertPhone(phone?: string | null): string | null {
  const raw = (phone || '').trim()
  if (raw.length < 9) return null
  return formatPhoneE164(raw)
}

/**
 * After any credit change: drop stale threshold flags on top-up,
 * then send at most one SMS for the lowest newly crossed level.
 * Safe to fire-and-forget; never throws to the caller.
 */
export async function syncLowBalanceAlerts(
  userId: UserId,
  newBalance?: number
): Promise<void> {
  try {
    const userObjectId = toObjectId(userId)
    const user = await User.findById(userObjectId)
      .select('phone email name creditsBalance lowBalanceAlertedThresholds')
      .lean()
    if (!user) return

    const balance =
      typeof newBalance === 'number' && Number.isFinite(newBalance)
        ? newBalance
        : user.creditsBalance || 0

    const alreadySent = Array.isArray(user.lowBalanceAlertedThresholds)
      ? user.lowBalanceAlertedThresholds
      : []
    const remaining = remainingAlertedThresholds(balance, alreadySent)
    const newlyCrossed = crossedLowBalanceThresholds(balance, remaining)

    if (remaining.length !== alreadySent.length) {
      await User.updateOne(
        { _id: userObjectId },
        { $set: { lowBalanceAlertedThresholds: remaining } }
      )
    }

    if (newlyCrossed.length === 0) return

    const phone = normalizeAlertPhone(user.phone)
    if (!phone) {
      console.warn('[low-balance-alert] skipped: no profile phone for user', String(userObjectId))
      return
    }

    const senderid = await resolveUserSenderName(userObjectId)
    if (!senderid) {
      console.warn('[low-balance-alert] skipped: no sender ID for user', String(userObjectId))
      return
    }

    const threshold = lowestThreshold(newlyCrossed)
    if (threshold == null) return

    const draftBody = buildLowBalanceSms(threshold, balance)
    const requiredCredits = calculateRequiredCredits(draftBody, 1)
    if (requiredCredits < 1 || balance < requiredCredits) {
      console.warn('[low-balance-alert] skipped: not enough credits to send alert', {
        userId: String(userObjectId),
        balance,
        requiredCredits,
      })
      return
    }

    const claimed: number[] = []
    for (const level of newlyCrossed) {
      const updated = await User.findOneAndUpdate(
        { _id: userObjectId, lowBalanceAlertedThresholds: { $ne: level } },
        { $addToSet: { lowBalanceAlertedThresholds: level } },
        { new: true }
      )
      if (updated) claimed.push(level)
    }
    if (claimed.length === 0) return

    const deducted = await User.findOneAndUpdate(
      { _id: userObjectId, creditsBalance: { $gte: requiredCredits } },
      { $inc: { creditsBalance: -requiredCredits } },
      { new: true }
    )

    if (!deducted) {
      await User.updateOne(
        { _id: userObjectId },
        { $pull: { lowBalanceAlertedThresholds: { $in: claimed } } }
      )
      console.warn('[low-balance-alert] skipped: could not deduct credits', String(userObjectId))
      return
    }

    const chargedBalance = deducted.creditsBalance || 0
    const body = buildLowBalanceSms(threshold, chargedBalance)
    const segments = calculateSegments153(body)
    const pricePerCreditKes = await resolvePricePerCreditKes(String(userObjectId))
    const totalCostKes = requiredCredits * pricePerCreditKes
    const { providerCostKes, profitKes } = await smsProfitFields(segments, totalCostKes)
    const messageFields = buildMessageBodyFields(body)

    const [smsMessage] = await SmsMessage.create([
      {
        userId: userObjectId,
        senderName: senderid,
        toNumbers: [phone],
        normalizedPhone: phone.replace(/^\+/, ''),
        ...messageFields,
        segments,
        costPerSegment: pricePerCreditKes,
        totalCost: totalCostKes,
        encoding: 'gsm7',
        parts: segments,
        chargedKes: totalCostKes,
        providerCostKes,
        profitKes,
        status: 'queued',
        providerStatus: 'PROCESSING',
        deliveryStatus: 'queued',
        deliveryMethod: 'provider',
        source: 'system',
        authMethod: 'system',
        clientId: userObjectId,
        clientUsername: user.email,
        clientName: user.name,
        nextCheckAt: initialNextCheckAt(),
        lastCheckedAt: null,
        statusCheckAttempts: 0,
        finalizedAt: null,
        creditDeducted: true,
        channel: 'sms',
        email: user.email,
        campaignName: 'low-balance-alert',
      },
    ])

    const refundAlert = async (errorCode: string, errorMessage: string) => {
      await User.updateOne(
        { _id: userObjectId },
        {
          $inc: { creditsBalance: requiredCredits },
          $pull: { lowBalanceAlertedThresholds: { $in: claimed } },
        }
      )
      await SmsMessage.findByIdAndUpdate(smsMessage._id, {
        status: 'failed',
        errorCode,
        errorMessage,
        failedAt: new Date(),
        finalizedAt: new Date(),
        nextCheckAt: null,
        refunded: true,
        profitKes: 0,
      })
    }

    try {
      const hpCreds = await resolveHostPinnacleCredentials(userObjectId)
      const result = await hostPinnacleClient.sendSms({
        mobile: phone.replace(/^\+/, ''),
        msg: body,
        senderid,
        retries: 1,
        options: hpCreds
          ? {
              apiKey: hpCreds.apiKey,
              userId: hpCreds.userId,
              password: hpCreds.password,
            }
          : undefined,
      })

      if (!result.success) {
        console.error('[low-balance-alert] SMS send failed:', result.error || result)
        await refundAlert('HP_API_ERROR', result.error || result.message || 'Low-balance alert send failed')
        return
      }

      const hpIds = extractHostPinnacleSendIds(result.data)
      const statusLookupId = primaryStatusLookupId(hpIds)
      const statusFields = await postSendStatusFields()
      await SmsMessage.findByIdAndUpdate(smsMessage._id, {
        externalMsgId: hpIds.messageId || statusLookupId,
        hpTransactionId: hpIds.transactionId || statusLookupId,
        ...statusFields,
      })

      const smsId = smsMessage._id?.toString()
      if (smsId && statusFields.status === 'sent') {
        schedulePostSendStatusSync(smsId)
      }
    } catch (sendError) {
      console.error('[low-balance-alert] send error:', sendError)
      await refundAlert(
        'ASYNC_ERROR',
        sendError instanceof Error ? sendError.message : 'Low-balance alert send failed'
      )
    }
  } catch (error) {
    console.error('[low-balance-alert] unexpected error:', error)
  }
}

export function queueLowBalanceAlertSync(userId: UserId, newBalance?: number): void {
  void syncLowBalanceAlerts(userId, newBalance)
}

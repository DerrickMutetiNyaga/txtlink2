/**
 * SMS Status Background Job
 *
 * Checks delivery status from HostPinnacle for a single SmsMessage and updates it.
 */

import mongoose from 'mongoose'
import { HostPinnacleAccount, SmsMessage, User } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'

const MAX_STATUS_ATTEMPTS = 5

type ProviderStatus = 'DELIVERED' | 'SUBMITTED' | 'FAILED' | string

export async function checkSmsStatusForMessage(messageId: string) {
  const smsMessage = await SmsMessage.findById(messageId)

  if (!smsMessage) return

  // Only check messages that are still in-flight
  if (!['queued', 'sent'].includes(smsMessage.status)) {
    return
  }

  if (smsMessage.statusCheckAttempts && smsMessage.statusCheckAttempts >= MAX_STATUS_ATTEMPTS) {
    return
  }

  const userId = smsMessage.userId as mongoose.Types.ObjectId

  // Find HostPinnacle account for this user (if any)
  const hpAccount = await HostPinnacleAccount.findOne({ userId })

  let apiKey: string | undefined
  let hpUserId: string | undefined
  let password: string | undefined

  if (hpAccount) {
    hpUserId = hpAccount.hpUserLoginName
    // Note: API key / password may be encrypted; in this app we only have decrypt helpers in sms send route.
    // For now we rely on master account env for status checks if decryption is not wired here.
  } else {
    hpUserId = process.env.HOSTPINNACLE_USERID
    password = process.env.HOSTPINNACLE_PASSWORD
  }

  const msgid = smsMessage.hpTransactionId || smsMessage.externalMsgId
  if (!msgid || !hpUserId) {
    await SmsMessage.findByIdAndUpdate(smsMessage._id, {
      $inc: { statusCheckAttempts: 1 },
      providerStatus: 'RETRYING',
      deliveryCause: 'Failed – No Status Report (missing msgid or userid)',
    })
    return
  }

  const statusResult = await hostPinnacleClient.readSmsStatus({
    msgid,
    options: {
      apiKey,
      userId: hpUserId,
      password,
    },
  })

  const update: any = {
    statusCheckAttempts: (smsMessage.statusCheckAttempts || 0) + 1,
  }

  if (!statusResult.success) {
    update.providerStatus = 'RETRYING'
    update.deliveryCause =
      statusResult.error || 'Failed – No Status Report'

    await SmsMessage.findByIdAndUpdate(smsMessage._id, update)
    return
  }

  const raw = statusResult.data?.response || statusResult.data || {}
  const providerStatus: ProviderStatus =
    raw.status || raw.Status || raw.delivery_status || 'PROCESSING'
  const cause: string =
    raw.cause || raw.Cause || raw.reason || raw.message || ''

  update.providerStatus = providerStatus
  update.deliveryCause = cause

  // Map provider status to internal status
  if (providerStatus === 'DELIVERED') {
    update.status = 'delivered'
    update.deliveredAt = new Date()
  } else if (providerStatus === 'SUBMITTED') {
    update.status = 'sent'
  } else if (providerStatus === 'FAILED') {
    update.status = 'failed'
    update.failedAt = new Date()
    update.errorMessage = cause || 'Failed from provider status API'

    // Do not refund credits here; refunds are controlled by DLR logic & pricing rules
  } else {
    // Any other value → keep as processing (queued/sent) but record status
    update.providerStatus = providerStatus || 'PROCESSING'
  }

  // Ensure we don't double-deduct credits
  if (update.status === 'delivered' || update.status === 'sent') {
    if (!smsMessage.creditDeducted) {
      // Credits were already deducted at send time in this app,
      // so we simply mark the flag to avoid double-charging.
      update.creditDeducted = true
    }
  }

  await SmsMessage.findByIdAndUpdate(smsMessage._id, update)

  // Optional: send admin notification hook could be added here using Telegram or email
}

/**
 * Batch job: check status for all messages that are still in-flight.
 */
export async function checkPendingSmsStatuses(limit = 50) {
  const pendingMessages = await SmsMessage.find({
    status: { $in: ['queued', 'sent'] },
    statusCheckAttempts: { $lt: MAX_STATUS_ATTEMPTS },
  })
    .sort({ createdAt: -1 })
    .limit(limit)

  for (const msg of pendingMessages) {
    try {
      await checkSmsStatusForMessage(msg._id!.toString())
    } catch (e) {
      console.error('Error checking SMS status for message', msg._id, e)
    }
  }
}



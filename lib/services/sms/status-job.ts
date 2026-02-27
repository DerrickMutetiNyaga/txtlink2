/**
 * SMS Status Background Job
 *
 * Checks delivery status from HostPinnacle for a single SmsMessage and updates it.
 * Based on PHP example: waits 10 seconds, parses response.reports_statusList[0].status.Status,
 * sends Telegram notification, and handles credit deduction properly.
 */

import mongoose from 'mongoose'
import { HostPinnacleAccount, SmsMessage, User } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import {
  sendTelegramNotification,
  formatSmsStatusNotification,
} from '@/lib/services/telegram/notify'

const MAX_STATUS_ATTEMPTS = 5

type ProviderStatus = 'DELIVERED' | 'SUBMITTED' | 'FAILED' | string

/**
 * Sleep/delay function
 */
function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * Deduct credits from user account
 */
async function deductCredits(userId: mongoose.Types.ObjectId, segments: number) {
  try {
    await User.findByIdAndUpdate(userId, {
      $inc: { creditsBalance: -segments },
    })
  } catch (error) {
    console.error('Error deducting credits:', error)
  }
}

export async function checkSmsStatusForMessage(messageId: string, waitSeconds = 10) {
  const smsMessage = await SmsMessage.findById(messageId).populate('userId', 'email')

  if (!smsMessage) return

  // Only check messages that are still in-flight
  if (!['queued', 'sent', 'processing', 'retrying'].includes(smsMessage.status)) {
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

  // Use uuid (matching PHP example) - this is the transactionId/externalMsgId
  const uuid = smsMessage.externalMsgId || smsMessage.hpTransactionId
  if (!uuid || !hpUserId) {
    await SmsMessage.findByIdAndUpdate(smsMessage._id, {
      $inc: { statusCheckAttempts: 1 },
      status: 'retrying',
      providerStatus: 'RETRYING',
      deliveryCause: 'Failed – No Status Report (missing uuid or userid)',
    })
    return
  }

  // Wait before checking status (matching PHP: sleep(10))
  if (waitSeconds > 0) {
    await sleep(waitSeconds)
  }

  const statusResult = await hostPinnacleClient.readSmsStatus({
    uuid,
    options: {
      apiKey,
      userId: hpUserId,
      password,
    },
  })

  const update: any = {
    statusCheckAttempts: (smsMessage.statusCheckAttempts || 0) + 1,
  }

  // Parse response structure: response.reports_statusList[0].status.Status (matching PHP)
  let reportStatus: string | null = null
  let cause: string = ''

  if (statusResult.success && statusResult.data) {
    const response = statusResult.data.response || statusResult.data
    
    // PHP: $statusData->response->reports_statusList[0]->status->Status
    if (response.reports_statusList && Array.isArray(response.reports_statusList) && response.reports_statusList.length > 0) {
      const report = response.reports_statusList[0]
      if (report.status) {
        reportStatus = report.status.Status || report.status.status || null
        cause = report.status.Cause || report.status.cause || ''
      }
    } else {
      // Fallback: try direct status fields
      reportStatus = response.status?.Status || response.status?.status || response.Status || response.status || null
      cause = response.status?.Cause || response.status?.cause || response.Cause || response.cause || ''
    }
  }

  // Get user email for notification
  const userEmail = (smsMessage as any).userId?.email || smsMessage.email || 'N/A'
  const phoneNumber = smsMessage.toNumbers?.[0] || 'N/A'
  const senderId = smsMessage.senderName || 'N/A'
  const channel = smsMessage.channel || 'sms'
  const message = smsMessage.message || 'N/A'
  const requestId = smsMessage._id?.toString() || 'N/A'

  // Send Telegram notification (matching PHP format)
  try {
    const notificationMessage = formatSmsStatusNotification({
      messageId: requestId,
      reportStatus: reportStatus || 'N/A',
      phoneNumber,
      senderId,
      email: userEmail,
      channel,
      message,
      fullResponse: statusResult.data || statusResult,
    })

    await sendTelegramNotification({ message: notificationMessage })
  } catch (telegramError) {
    console.error('Failed to send Telegram notification:', telegramError)
    // Don't fail the status check if Telegram fails
  }

  // Update status based on reportStatus (matching PHP logic)
  // Note: In our system, credits are already deducted at send time,
  // so we only mark creditDeducted = true for successful statuses
  if (reportStatus) {
    const deliveryStatus = reportStatus.toUpperCase()

    if (deliveryStatus === 'DELIVERED') {
      update.status = 'delivered'
      update.deliveredAt = new Date()
      // Credits already deducted at send time, just mark as deducted
      update.creditDeducted = true
    } else if (deliveryStatus === 'SUBMITTED') {
      update.status = 'sent'
      // Credits already deducted at send time, just mark as deducted
      update.creditDeducted = true
    } else if (deliveryStatus === 'FAILED') {
      update.status = 'failed'
      update.failedAt = new Date()
      update.errorMessage = cause || 'Failed from provider status API'
      
      // PHP: If failure cause is "User has blacklisted sender ID", still deduct credits
      // In our system, credits are already deducted, so we keep them (don't refund)
      if (cause && cause.toLowerCase().includes('user has blacklisted sender id')) {
        // Keep credits (already deducted, don't refund)
        update.creditDeducted = true
        update.refunded = false
      } else {
        // Other failures: refund credits if not already refunded
        if (!smsMessage.refunded) {
          await User.findByIdAndUpdate(userId, {
            $inc: { creditsBalance: smsMessage.segments || 1 },
          })
          update.refunded = true
        }
      }
    } else {
      // Any other value → mark as Processing
      update.status = 'processing'
    }

    update.providerStatus = reportStatus
    update.deliveryCause = cause
    update.externalMsgId = uuid
  } else {
    // No status returned → mark as Retrying
    update.status = 'retrying'
    update.providerStatus = 'RETRYING'
    update.deliveryCause = 'Failed – No Status Report'
  }

  await SmsMessage.findByIdAndUpdate(smsMessage._id, update)
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



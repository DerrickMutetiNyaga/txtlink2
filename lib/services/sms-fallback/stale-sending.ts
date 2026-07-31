import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, SmsGatewayDevice } from '@/lib/db/models'
import {
  getGatewayLatestActivity,
  getGatewayOnlineThresholdMs,
} from '@/lib/services/sms-gateway/status'
import { getFallbackScanBatchSize, getFallbackScanConcurrency } from './config'
import { mapPool } from './concurrency'

export const GATEWAY_SENDING_TIMEOUT_MS = 5 * 60 * 1000
export const GATEWAY_MAX_SEND_ATTEMPTS = 3

function isDeviceOffline(device: {
  lastHeartbeatAt?: Date | null
  lastSyncAt?: Date | null
} | null): boolean {
  if (!device) return true
  const latest = getGatewayLatestActivity(device)
  if (!latest) return true
  return Date.now() - latest.getTime() > getGatewayOnlineThresholdMs()
}

/**
 * Stuck "sending" jobs: reset to pending if gateway is offline (app may be down).
 * Mark failed only when gateway was recently online (likely a real timeout).
 */
export async function resetStaleSendingJobs(): Promise<number> {
  await connectDB()

  const cutoff = new Date(Date.now() - GATEWAY_SENDING_TIMEOUT_MS)
  const now = new Date()
  const batchSize = getFallbackScanBatchSize()
  const concurrency = getFallbackScanConcurrency()

  const stuckJobs = await SmsFallbackJob.find({
    status: 'sending',
    sendingAt: { $lte: cutoff },
  })
    .limit(batchSize)
    .lean()

  if (stuckJobs.length === 0) return 0

  const results = await mapPool(stuckJobs, concurrency, async (job) => {
    const device = await SmsGatewayDevice.findOne({ userId: job.userId }).lean()
    const offline = isDeviceOffline(device)

    if (offline && (job.attempts || 0) < GATEWAY_MAX_SEND_ATTEMPTS) {
      await SmsFallbackJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'pending',
          phoneStatus: 'pending',
          resetReason: 'gateway_offline',
        },
        $unset: { sendingAt: 1, lockedAt: 1, lockedBy: 1 },
      })
      return true
    }

    await SmsFallbackJob.findByIdAndUpdate(job._id, {
      status: 'failed',
      phoneStatus: 'failed',
      failedAt: now,
      failureReason: offline
        ? 'Sending timeout — gateway offline'
        : 'Sending timeout — device did not confirm sent or failed',
      failureCode: 'SENDING_TIMEOUT',
    })

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        status: 'failed',
        fallbackStatus: 'phone_failed',
        fallbackFailedAt: now,
        fallbackFailureReason: 'Sending timeout — device did not confirm sent or failed',
        fallbackFailureCode: 'SENDING_TIMEOUT',
        deliveryMethod: 'android_phone_gateway_failed',
        failedAt: now,
        finalizedAt: now,
        nextCheckAt: null,
        errorMessage: 'Sending timeout — device did not confirm sent or failed',
        errorCode: 'SENDING_TIMEOUT',
      })
    }
    return true
  })

  return results.filter(Boolean).length
}

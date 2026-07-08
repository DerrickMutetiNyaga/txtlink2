import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'

export const GATEWAY_SENDING_TIMEOUT_MS = 5 * 60 * 1000
export const GATEWAY_MAX_SEND_ATTEMPTS = 3

export async function resetStaleSendingJobs(): Promise<number> {
  await connectDB()

  const cutoff = new Date(Date.now() - GATEWAY_SENDING_TIMEOUT_MS)
  const now = new Date()

  const expired = await SmsFallbackJob.updateMany(
    {
      status: 'sending',
      sendingAt: { $lte: cutoff },
      attempts: { $gte: GATEWAY_MAX_SEND_ATTEMPTS },
    },
    {
      $set: {
        status: 'failed',
        failedAt: now,
        failureReason: 'Sending timeout — max attempts reached',
        failureCode: 'SENDING_TIMEOUT_MAX_ATTEMPTS',
      },
    }
  )

  const reset = await SmsFallbackJob.updateMany(
    {
      status: 'sending',
      sendingAt: { $lte: cutoff },
      attempts: { $lt: GATEWAY_MAX_SEND_ATTEMPTS },
    },
    {
      $set: {
        status: 'pending',
        resetReason: 'sending_timeout',
      },
      $unset: {
        sendingAt: 1,
        lockedAt: 1,
        lockedBy: 1,
      },
    }
  )

  const failedJobs = await SmsFallbackJob.find({
    status: 'failed',
    failureCode: 'SENDING_TIMEOUT_MAX_ATTEMPTS',
    failedAt: { $gte: new Date(now.getTime() - 1000) },
    isTest: { $ne: true },
  }).lean()

  for (const job of failedJobs) {
    await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
      fallbackStatus: 'phone_failed',
      fallbackFailedAt: now,
      fallbackFailureReason: 'Sending timeout — max attempts reached',
    })
  }

  return reset.modifiedCount + expired.modifiedCount
}

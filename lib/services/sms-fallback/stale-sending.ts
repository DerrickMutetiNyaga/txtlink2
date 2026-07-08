import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'

export const GATEWAY_SENDING_TIMEOUT_MS = 5 * 60 * 1000

/** Mark stuck sending jobs as failed — never auto-reset to pending. */
export async function resetStaleSendingJobs(): Promise<number> {
  await connectDB()

  const cutoff = new Date(Date.now() - GATEWAY_SENDING_TIMEOUT_MS)
  const now = new Date()

  const stuck = await SmsFallbackJob.updateMany(
    {
      status: 'sending',
      sendingAt: { $lte: cutoff },
    },
    {
      $set: {
        status: 'failed',
        failedAt: now,
        failureReason: 'Sending timeout — device did not confirm sent or failed',
        failureCode: 'SENDING_TIMEOUT',
      },
    }
  )

  if (stuck.modifiedCount === 0) {
    return 0
  }

  const failedJobs = await SmsFallbackJob.find({
    status: 'failed',
    failureCode: 'SENDING_TIMEOUT',
    failedAt: { $gte: new Date(now.getTime() - 2000) },
    isTest: { $ne: true },
  }).lean()

  for (const job of failedJobs) {
    await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
      fallbackStatus: 'phone_failed',
      fallbackFailedAt: now,
      fallbackFailureReason: 'Sending timeout — device did not confirm sent or failed',
      fallbackFailureCode: 'SENDING_TIMEOUT',
    })
  }

  return stuck.modifiedCount
}

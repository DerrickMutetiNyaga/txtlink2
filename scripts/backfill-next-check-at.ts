/**
 * One-time backfill: schedule status checks for legacy pending messages.
 *
 * Messages created before the nextCheckAt field existed have nextCheckAt=null
 * and would never be claimed by the status worker. This sets nextCheckAt=now
 * for every pending message missing it, so the worker picks them up on its
 * next cycle (backoff then proceeds normally from their current attempt count).
 *
 * Run once after deploying the new schema:
 *   npx tsx scripts/backfill-next-check-at.ts
 */

import 'dotenv/config'

async function main() {
  const { default: connectDB } = await import('@/lib/db/connect')
  const { SmsMessage, SMS_PENDING_STATUSES } = await import('@/lib/db/models')

  await connectDB()

  const result = await SmsMessage.updateMany(
    {
      status: { $in: [...SMS_PENDING_STATUSES] },
      $or: [{ nextCheckAt: null }, { nextCheckAt: { $exists: false } }],
    },
    { $set: { nextCheckAt: new Date() } }
  )

  console.log(`Backfill complete: ${result.modifiedCount} pending messages scheduled for status check`)

  const mongoose = (await import('mongoose')).default
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Backfill failed:', error)
  process.exit(1)
})

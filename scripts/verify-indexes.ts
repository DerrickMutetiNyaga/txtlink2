/**
 * Production verification: SMS status indexes + claim-query plan.
 *
 * Run against the production database (read-only; creates missing schema
 * indexes first via syncIndexes only when --sync is passed):
 *
 *   npx tsx scripts/verify-indexes.ts          # report only
 *   npx tsx scripts/verify-indexes.ts --sync   # also build missing indexes
 *
 * Verifies:
 *   1. All SmsMessage indexes exist (prints db.smsmessages.getIndexes()).
 *   2. The partial pending_status_check index is present.
 *   3. The worker claim query uses IXSCAN (not COLLSCAN) via explain().
 */

import 'dotenv/config'

async function main() {
  const { default: connectDB } = await import('@/lib/db/connect')
  const { SmsMessage, SMS_PENDING_STATUSES } = await import('@/lib/db/models')

  await connectDB()

  if (process.argv.includes('--sync')) {
    console.log('Building missing schema indexes (syncIndexes)...')
    const result = await SmsMessage.syncIndexes()
    console.log('syncIndexes result:', result)
  }

  const indexes = await SmsMessage.collection.indexes()
  console.log('\n=== smsmessages indexes ===')
  for (const idx of indexes) {
    console.log(
      `- ${idx.name}: keys=${JSON.stringify(idx.key)}` +
        (idx.partialFilterExpression
          ? ` partial=${JSON.stringify(idx.partialFilterExpression)}`
          : '')
    )
  }

  const pendingIndex = indexes.find((idx) => idx.name === 'pending_status_check')
  if (!pendingIndex) {
    console.error('\nFAIL: pending_status_check partial index is MISSING.')
    console.error('Run again with --sync, or create it manually.')
    process.exitCode = 1
  } else {
    console.log('\nOK: pending_status_check partial index exists.')
  }

  // Explain the exact claim query the worker runs
  const now = new Date()
  const explain = await SmsMessage.find({
    status: { $in: [...SMS_PENDING_STATUSES] },
    nextCheckAt: { $lte: now },
    $or: [{ statusCheckLockedUntil: null }, { statusCheckLockedUntil: { $lte: now } }],
  })
    .sort({ nextCheckAt: 1 })
    .limit(1)
    .explain('queryPlanner')

  const plannerJson = JSON.stringify(explain)
  const usesCollscan = plannerJson.includes('"COLLSCAN"')
  const usesIxscan = plannerJson.includes('"IXSCAN"')

  console.log('\n=== claim query plan ===')
  console.log(
    JSON.stringify((explain as any)?.queryPlanner?.winningPlan ?? explain, null, 2)
  )

  if (usesCollscan || !usesIxscan) {
    console.error('\nFAIL: claim query is not using an index (COLLSCAN detected).')
    process.exitCode = 1
  } else {
    console.log('\nOK: claim query uses IXSCAN.')
  }

  const mongoose = (await import('mongoose')).default
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error('Verification failed:', error)
  process.exit(1)
})

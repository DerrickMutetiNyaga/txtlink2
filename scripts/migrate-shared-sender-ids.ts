/**
 * Migrate UserSenderId indexes for shared sender IDs across accounts.
 *
 * Drops the legacy unique index on senderId alone and builds:
 *   - unique (userId, senderId) — one link per user per sender ID
 *   - non-unique senderId — lookup shared assignments
 *
 *   npx tsx scripts/migrate-shared-sender-ids.ts
 */

import 'dotenv/config'

async function main() {
  const { default: connectDB } = await import('@/lib/db/connect')
  const { UserSenderId } = await import('@/lib/db/models')

  await connectDB()
  const collection = UserSenderId.collection
  const indexes = await collection.indexes()

  console.log('Current UserSenderId indexes:')
  for (const idx of indexes) {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} unique=${!!idx.unique}`)
  }

  const legacyUnique = indexes.find(
    (idx) => idx.key?.senderId === 1 && Object.keys(idx.key).length === 1 && idx.unique
  )

  if (legacyUnique?.name) {
    console.log(`\nDropping legacy unique index: ${legacyUnique.name}`)
    await collection.dropIndex(legacyUnique.name)
    console.log('Dropped.')
  } else {
    console.log('\nNo legacy senderId-only unique index found (already migrated or fresh DB).')
  }

  console.log('\nSyncing UserSenderId schema indexes...')
  const result = await UserSenderId.syncIndexes()
  console.log('syncIndexes result:', result)

  const after = await collection.indexes()
  console.log('\nIndexes after migration:')
  for (const idx of after) {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} unique=${!!idx.unique}`)
  }

  const mongoose = (await import('mongoose')).default
  await mongoose.disconnect()
  console.log('\nDone. Sender IDs can now be assigned to multiple accounts.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * Ensure UserSenderId indexes allow the same sender ID on multiple users.
 * Drops legacy unique index on senderId alone if present.
 */

let migrationPromise: Promise<void> | null = null

export async function ensureSharedSenderIdIndexes(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runMigration().finally(() => {
      migrationPromise = null
    })
  }
  await migrationPromise
}

async function runMigration(): Promise<void> {
  const { UserSenderId } = await import('@/lib/db/models')
  const collection = UserSenderId.collection
  const indexes = await collection.indexes()

  const legacyUnique = indexes.find(
    (idx) => idx.key?.senderId === 1 && Object.keys(idx.key).length === 1 && idx.unique
  )

  if (legacyUnique?.name) {
    console.log(`[senderids] Dropping legacy unique index: ${legacyUnique.name}`)
    await collection.dropIndex(legacyUnique.name)
  }

  await UserSenderId.syncIndexes()
}

export function isLegacySenderIdUniqueError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: number; keyPattern?: Record<string, number> }
  return err.code === 11000 && !!err.keyPattern?.senderId && !err.keyPattern?.userId
}

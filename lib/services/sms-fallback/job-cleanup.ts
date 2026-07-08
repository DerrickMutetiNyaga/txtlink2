import mongoose from 'mongoose'
import { SmsFallbackJob, User } from '@/lib/db/models'

export const MAX_FALLBACK_JOB_RETENTION_DAYS = 3
export const DEFAULT_FALLBACK_JOB_RETENTION_DAYS = 3
export const FALLBACK_QUEUE_PAGE_SIZE = 5

export const DELETABLE_FALLBACK_JOB_STATUSES = [
  'delivered',
  'sent',
  'failed',
  'cancelled',
] as const

export function normalizeFallbackRetentionDays(value: unknown): number {
  const parsed =
    typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_FALLBACK_JOB_RETENTION_DAYS
  }
  return Math.min(parsed, MAX_FALLBACK_JOB_RETENTION_DAYS)
}

export function getEffectiveFallbackRetentionDays(userDays?: number | null): number {
  return normalizeFallbackRetentionDays(
    userDays ?? DEFAULT_FALLBACK_JOB_RETENTION_DAYS
  )
}

export async function cleanupOldFallbackJobsForUser(
  userId: mongoose.Types.ObjectId,
  retentionDays?: number | null
): Promise<number> {
  const days = getEffectiveFallbackRetentionDays(retentionDays)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await SmsFallbackJob.deleteMany({
    userId,
    status: { $in: [...DELETABLE_FALLBACK_JOB_STATUSES] },
    createdAt: { $lt: cutoff },
  })

  return result.deletedCount || 0
}

export async function resolveUserFallbackRetentionDays(
  userId: mongoose.Types.ObjectId
): Promise<number> {
  const user = await User.findById(userId).select('smsFallbackRetentionDays').lean()
  return getEffectiveFallbackRetentionDays(user?.smsFallbackRetentionDays)
}

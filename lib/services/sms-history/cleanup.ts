import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SmsMessage, SmsFallbackJob, User } from '@/lib/db/models'
import {
  ACTIVE_FALLBACK_STATUSES,
  DELETABLE_STATUSES,
  getEffectiveRetentionLimit,
} from './constants'

const ACTIVE_JOB_STATUSES = ['pending', 'sending', 'blocked']

export interface UserCleanupResult {
  userId: string
  limit: number | null
  beforeCount: number
  deleted: number
  afterCount: number
  skipped: boolean
  reason?: string
}

export interface CleanupSummary {
  success: true
  usersProcessed: number
  totalDeleted: number
  results: UserCleanupResult[]
}

async function getProtectedSmsIds(userId: mongoose.Types.ObjectId): Promise<Set<string>> {
  const protectedIds = new Set<string>()

  const activeFallbackMessages = await SmsMessage.find({
    userId,
    fallbackStatus: { $in: [...ACTIVE_FALLBACK_STATUSES] },
  })
    .select('_id')
    .lean()

  for (const msg of activeFallbackMessages) {
    protectedIds.add(String(msg._id))
  }

  const activeJobs = await SmsFallbackJob.find({
    userId,
    status: { $in: ACTIVE_JOB_STATUSES },
  })
    .select('originalSmsId phoneStatus')
    .lean()

  for (const job of activeJobs) {
    if (job.phoneStatus === 'requires_topup' || job.phoneStatus === 'pending' || job.phoneStatus === 'sending') {
      protectedIds.add(String(job.originalSmsId))
    }
    protectedIds.add(String(job.originalSmsId))
  }

  return protectedIds
}

export async function cleanupOldSmsHistoryForUser(
  userId: mongoose.Types.ObjectId,
  retentionLimit?: number | null
): Promise<UserCleanupResult> {
  await connectDB()

  const user = await User.findById(userId).select('smsHistoryRetentionLimit').lean()
  const limit =
    retentionLimit !== undefined
      ? getEffectiveRetentionLimit(retentionLimit)
      : getEffectiveRetentionLimit(user?.smsHistoryRetentionLimit)

  const beforeCount = await SmsMessage.countDocuments({ userId })

  if (limit === null) {
    return {
      userId: String(userId),
      limit: null,
      beforeCount,
      deleted: 0,
      afterCount: beforeCount,
      skipped: true,
      reason: 'unlimited',
    }
  }

  if (beforeCount <= limit) {
    return {
      userId: String(userId),
      limit,
      beforeCount,
      deleted: 0,
      afterCount: beforeCount,
      skipped: true,
      reason: 'under_limit',
    }
  }

  const protectedIds = await getProtectedSmsIds(userId)
  const toDelete = beforeCount - limit

  const candidates = await SmsMessage.find({
    userId,
    status: { $in: [...DELETABLE_STATUSES] },
    fallbackStatus: { $nin: [...ACTIVE_FALLBACK_STATUSES] },
    _id: { $nin: [...protectedIds].map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .sort({ createdAt: 1 })
    .limit(toDelete + 500)
    .select('_id fallbackStatus status')
    .lean()

  const idsToDelete: mongoose.Types.ObjectId[] = []
  for (const msg of candidates) {
    if (protectedIds.has(String(msg._id))) continue
    if (ACTIVE_FALLBACK_STATUSES.includes(msg.fallbackStatus as (typeof ACTIVE_FALLBACK_STATUSES)[number])) {
      continue
    }
    idsToDelete.push(new mongoose.Types.ObjectId(String(msg._id)))
    if (idsToDelete.length >= toDelete) break
  }

  if (idsToDelete.length === 0) {
    return {
      userId: String(userId),
      limit,
      beforeCount,
      deleted: 0,
      afterCount: beforeCount,
      skipped: true,
      reason: 'no_deletable_records',
    }
  }

  const deleteResult = await SmsMessage.deleteMany({ _id: { $in: idsToDelete }, userId })
  const deleted = deleteResult.deletedCount || 0
  const afterCount = beforeCount - deleted

  return {
    userId: String(userId),
    limit,
    beforeCount,
    deleted,
    afterCount,
    skipped: false,
  }
}

export async function cleanupOldSmsHistory(): Promise<CleanupSummary> {
  await connectDB()

  const users = await User.find({ isActive: true }).select('_id smsHistoryRetentionLimit').lean()
  const results: UserCleanupResult[] = []
  let totalDeleted = 0

  for (const user of users) {
    const userId = new mongoose.Types.ObjectId(String(user._id))
    const result = await cleanupOldSmsHistoryForUser(userId, user.smsHistoryRetentionLimit)
    results.push(result)
    totalDeleted += result.deleted
  }

  return {
    success: true,
    usersProcessed: results.length,
    totalDeleted,
    results,
  }
}

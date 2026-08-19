import mongoose from 'mongoose'
import { SmsMessage, SMS_PENDING_STATUSES } from '@/lib/db/models'
import { FAILED_LIKE_STATUSES } from '@/lib/services/sms-history/constants'

export interface UserDeliveryStats {
  total: number
  delivered: number
  sent: number
  pending: number
  failed: number
  lastSmsAt: string | null
}

const EMPTY_STATS: UserDeliveryStats = {
  total: 0,
  delivered: 0,
  sent: 0,
  pending: 0,
  failed: 0,
  lastSmsAt: null,
}

const PENDING_ONLY = SMS_PENDING_STATUSES.filter((status) => status !== 'sent')

function toStats(row?: {
  total?: number
  delivered?: number
  sent?: number
  pending?: number
  failed?: number
  lastSmsAt?: Date | string | null
}): UserDeliveryStats {
  if (!row) return { ...EMPTY_STATS }
  return {
    total: row.total || 0,
    delivered: row.delivered || 0,
    sent: row.sent || 0,
    pending: row.pending || 0,
    failed: row.failed || 0,
    lastSmsAt: row.lastSmsAt ? new Date(row.lastSmsAt).toISOString() : null,
  }
}

const STATUS_GROUP = {
  _id: '$userId',
  total: { $sum: 1 },
  delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
  sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
  pending: { $sum: { $cond: [{ $in: ['$status', PENDING_ONLY] }, 1, 0] } },
  failed: { $sum: { $cond: [{ $in: ['$status', [...FAILED_LIKE_STATUSES]] }, 1, 0] } },
  lastSmsAt: { $max: '$createdAt' },
}

export async function getDeliveryStatsByUser(): Promise<Map<string, UserDeliveryStats>> {
  const rows = await SmsMessage.aggregate([{ $group: STATUS_GROUP }])
  const map = new Map<string, UserDeliveryStats>()
  for (const row of rows) {
    map.set(String(row._id), toStats(row))
  }
  return map
}

export async function getUserDeliveryStats(
  userId: mongoose.Types.ObjectId | string
): Promise<UserDeliveryStats> {
  const id = new mongoose.Types.ObjectId(String(userId))
  const rows = await SmsMessage.aggregate([{ $match: { userId: id } }, { $group: STATUS_GROUP }])
  return toStats(rows[0])
}

export function deliveryHealth(stats: UserDeliveryStats): 'none' | 'good' | 'watch' | 'problem' {
  if (stats.total === 0) return 'none'
  const failRate = stats.failed / stats.total
  if (stats.delivered === 0 && stats.failed > 0) return 'problem'
  if (failRate >= 0.3) return 'problem'
  if (failRate >= 0.1 || stats.pending + stats.sent > stats.delivered) return 'watch'
  return 'good'
}

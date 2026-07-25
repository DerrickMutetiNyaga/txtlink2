/**
 * On-demand delivery status sync for a user's pending messages via HostPinnacle.
 */

import mongoose from 'mongoose'
import { SmsMessage, SMS_PENDING_STATUSES } from '@/lib/db/models'
import { getSharedSynchronizer } from './build-synchronizer'
import type { ClaimedMessage } from './status-repository'

function toClaimedMessage(doc: Record<string, unknown>): ClaimedMessage {
  return {
    _id: doc._id as mongoose.Types.ObjectId,
    userId: doc.userId as mongoose.Types.ObjectId,
    status: doc.status as ClaimedMessage['status'],
    externalMsgId: (doc.externalMsgId as string) || null,
    hpTransactionId: (doc.hpTransactionId as string) || null,
    providerMessageId: (doc.externalMsgId || doc.hpTransactionId || null) as string | null,
    statusCheckAttempts: (doc.statusCheckAttempts as number) ?? 0,
    segments: (doc.segments as number) ?? 1,
    refunded: Boolean(doc.refunded),
    sentAt: (doc.sentAt as Date) ?? null,
    createdAt: doc.createdAt as Date,
    toNumbers: (doc.toNumbers as string[]) ?? [],
    senderName: (doc.senderName as string) ?? '',
  }
}

export async function syncUserPendingMessages(
  userId: string,
  limit = 25
): Promise<{ checked: number; finalized: number }> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const docs = await SmsMessage.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: [...SMS_PENDING_STATUSES] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .lean()

  if (docs.length === 0) {
    return { checked: 0, finalized: 0 }
  }

  const { synchronizer } = await getSharedSynchronizer()
  let checked = 0
  let finalized = 0

  for (const doc of docs) {
    if (!doc.externalMsgId && !doc.hpTransactionId) continue

    checked++
    try {
      const outcome = await synchronizer.syncClaimedMessage(
        toClaimedMessage(doc as Record<string, unknown>)
      )
      if (outcome === 'finalized') finalized++
    } catch (error) {
      console.error('syncUserPendingMessages failed:', {
        messageId: doc._id?.toString(),
        error,
      })
    }
  }

  return { checked, finalized }
}

/** Poll HostPinnacle immediately for one message (webhook-free delivery tracking). */
export async function syncSmsMessageById(messageId: string): Promise<boolean> {
  const doc = await SmsMessage.findById(messageId).lean()
  if (!doc) return false
  if (!(SMS_PENDING_STATUSES as readonly string[]).includes(doc.status)) return false
  if (!doc.externalMsgId && !doc.hpTransactionId) return false

  const { synchronizer } = await getSharedSynchronizer()
  const outcome = await synchronizer.syncClaimedMessage(
    toClaimedMessage(doc as Record<string, unknown>)
  )
  return outcome === 'finalized'
}

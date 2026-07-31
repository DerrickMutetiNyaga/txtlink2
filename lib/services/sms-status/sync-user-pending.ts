/**
 * On-demand delivery status sync for a user's pending messages via HostPinnacle.
 * Prefer syncing specific message IDs so the UI can patch rows without reloading history.
 */

import mongoose from 'mongoose'
import { SmsMessage, SMS_PENDING_STATUSES, type ISmsMessage } from '@/lib/db/models'
import { getSharedSynchronizer } from './build-synchronizer'
import type { ClaimedMessage } from './status-repository'
import { formatSmsHistoryRow, type FormattedSmsHistoryRow } from '@/lib/services/sms-history/format'

/** Provider statuses that mean real handset delivery — anything else on a
 *  "delivered" row is suspicious (API success / auto-mark / DeliveredTime bug). */
const REAL_DELIVERED_PROVIDER = new Set(['DELIVERED', 'DELIVRD', 'DLVRD', 'DLV'])

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

/** True when a delivered row likely never got a real HostPinnacle DELIVERED DLR. */
export function looksFalselyDelivered(doc: {
  status?: string
  providerStatus?: string | null
}): boolean {
  if (doc.status !== 'delivered') return false
  const raw = (doc.providerStatus || '').trim().toUpperCase()
  if (!raw) return true
  return !REAL_DELIVERED_PROVIDER.has(raw)
}

export type SyncPendingResult = {
  checked: number
  finalized: number
  updates: FormattedSmsHistoryRow[]
}

async function loadFormattedByIds(
  userId: mongoose.Types.ObjectId,
  ids: string[]
): Promise<FormattedSmsHistoryRow[]> {
  if (ids.length === 0) return []
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  if (objectIds.length === 0) return []

  const docs = await SmsMessage.find({ userId, _id: { $in: objectIds } }).lean()
  return docs.map((msg) => formatSmsHistoryRow(msg as ISmsMessage & { _id: unknown }))
}

export async function syncUserPendingMessages(
  userId: string,
  limit = 25,
  messageIds?: string[]
): Promise<SyncPendingResult> {
  const userObjectId = new mongoose.Types.ObjectId(userId)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  let docs: Record<string, unknown>[]

  if (messageIds && messageIds.length > 0) {
    const objectIds = messageIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id))
    docs = (await SmsMessage.find({
      _id: { $in: objectIds },
      userId: userObjectId,
    }).lean()) as Record<string, unknown>[]
  } else {
    docs = (await SmsMessage.find({
      userId: userObjectId,
      createdAt: { $gte: since },
      $or: [
        { status: { $in: [...SMS_PENDING_STATUSES] } },
        // Re-check rows marked delivered without a real HostPinnacle DELIVERED
        {
          status: 'delivered',
          $or: [
            { providerStatus: { $exists: false } },
            { providerStatus: null },
            { providerStatus: '' },
            { providerStatus: { $nin: ['DELIVERED', 'DELIVRD', 'DLVRD', 'DLV'] } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 50))
      .lean()) as Record<string, unknown>[]
  }

  docs = docs.filter(
    (doc) =>
      (SMS_PENDING_STATUSES as readonly string[]).includes(String(doc.status)) ||
      looksFalselyDelivered(doc as { status?: string; providerStatus?: string | null })
  )

  if (docs.length === 0) {
    const updates = messageIds?.length
      ? await loadFormattedByIds(userObjectId, messageIds)
      : []
    return { checked: 0, finalized: 0, updates }
  }

  const { synchronizer } = await getSharedSynchronizer()
  let checked = 0
  let finalized = 0
  const touchedIds: string[] = []

  for (const doc of docs) {
    const id = String(doc._id)
    touchedIds.push(id)
    if (!doc.externalMsgId && !doc.hpTransactionId) continue

    checked++
    try {
      // Treat falsely-delivered as pending so HostPinnacle FAILED can correct it.
      const claimed = toClaimedMessage(doc)
      if (looksFalselyDelivered(doc as { status?: string; providerStatus?: string | null })) {
        claimed.status = 'sent'
      }
      const outcome = await synchronizer.syncClaimedMessage(claimed)
      if (outcome === 'finalized') finalized++
    } catch (error) {
      console.error('syncUserPendingMessages failed:', {
        messageId: id,
        error,
      })
    }
  }

  const idsToReturn =
    messageIds && messageIds.length > 0
      ? Array.from(new Set([...messageIds, ...touchedIds]))
      : touchedIds

  const updates = await loadFormattedByIds(userObjectId, idsToReturn)
  return { checked, finalized, updates }
}

/** Poll HostPinnacle immediately for one message (webhook-free delivery tracking). */
export async function syncSmsMessageById(messageId: string): Promise<boolean> {
  const doc = await SmsMessage.findById(messageId).lean()
  if (!doc) return false
  const pending = (SMS_PENDING_STATUSES as readonly string[]).includes(doc.status)
  const falseDelivered = looksFalselyDelivered(doc)
  if (!pending && !falseDelivered) return false
  if (!doc.externalMsgId && !doc.hpTransactionId) return false

  const { synchronizer } = await getSharedSynchronizer()
  const claimed = toClaimedMessage(doc as Record<string, unknown>)
  if (falseDelivered) claimed.status = 'sent'
  const outcome = await synchronizer.syncClaimedMessage(claimed)
  return outcome === 'finalized'
}

/**
 * StatusRepository - all MongoDB access for the delivery-status subsystem.
 *
 * Includes the atomic work-claiming logic that makes it safe to run multiple
 * worker instances: a message is claimed by atomically setting a lease
 * (statusCheckLockedUntil + statusCheckWorkerId) with findOneAndUpdate, so no
 * two workers can ever hold the same message at the same time. Leases expire
 * automatically, so a crashed worker's messages become claimable again.
 */

import mongoose from 'mongoose'
import { SmsMessage, User, SMS_PENDING_STATUSES, type ISmsMessage, type SmsStatus } from '@/lib/db/models'
export interface ClaimedMessage {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: SmsStatus
  providerMessageId: string | null
  statusCheckAttempts: number
  segments: number
  refunded: boolean
  sentAt: Date | null
  createdAt: Date
  toNumbers: string[]
  senderName: string
}

function toClaimedMessage(doc: any): ClaimedMessage {
  return {
    _id: doc._id,
    userId: doc.userId,
    status: doc.status,
    providerMessageId: doc.externalMsgId || doc.hpTransactionId || null,
    statusCheckAttempts: doc.statusCheckAttempts ?? 0,
    segments: doc.segments ?? 1,
    refunded: doc.refunded ?? false,
    sentAt: doc.sentAt ?? null,
    createdAt: doc.createdAt,
    toNumbers: doc.toNumbers ?? [],
    senderName: doc.senderName ?? '',
  }
}

export class StatusRepository {
  /**
   * Atomically claim up to `batchSize` due pending messages for `workerId`.
   *
   * Uses repeated findOneAndUpdate claims (the safest pattern under many
   * workers): each call atomically matches an unclaimed due message and sets
   * the lease in the same operation, so concurrent workers can never claim
   * the same document. The query is fully covered by the partial
   * `pending_status_check` index.
   */
  async claimDueMessages(params: {
    workerId: string
    batchSize: number
    leaseSeconds: number
    now?: Date
  }): Promise<ClaimedMessage[]> {
    const now = params.now ?? new Date()
    const lockUntil = new Date(now.getTime() + params.leaseSeconds * 1000)
    const claimed: ClaimedMessage[] = []

    for (let i = 0; i < params.batchSize; i++) {
      const doc = await SmsMessage.findOneAndUpdate(
        {
          status: { $in: [...SMS_PENDING_STATUSES] },
          nextCheckAt: { $lte: now },
          $or: [
            { statusCheckLockedUntil: null },
            { statusCheckLockedUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            statusCheckLockedUntil: lockUntil,
            statusCheckWorkerId: params.workerId,
          },
          $inc: { statusCheckAttempts: 1 },
        },
        {
          // Sort by nextCheckAt only: it is the leading key of the partial
          // pending_status_check index, so MongoDB satisfies both the filter
          // and the ordering with an IXSCAN - no in-memory sort even with a
          // large backlog. (An _id tiebreaker would force a blocking sort.)
          sort: { nextCheckAt: 1 },
          new: true,
        }
      ).lean()

      if (!doc) break
      claimed.push(toClaimedMessage(doc))
    }

    return claimed
  }

  /** Mark a message final. Clears the lease and the check schedule. */
  async markFinal(params: {
    messageId: mongoose.Types.ObjectId | string
    status: SmsStatus
    providerStatusRaw?: string
    cause?: string
    errorMessage?: string
    now?: Date
  }): Promise<void> {
    const now = params.now ?? new Date()
    const update: Record<string, any> = {
      status: params.status,
      finalizedAt: now,
      lastCheckedAt: now,
      nextCheckAt: null,
      statusCheckLockedUntil: null,
      statusCheckWorkerId: null,
    }
    if (params.providerStatusRaw !== undefined) update.providerStatus = params.providerStatusRaw
    if (params.cause !== undefined) update.deliveryCause = params.cause
    if (params.errorMessage !== undefined) update.errorMessage = params.errorMessage
    if (params.status === 'delivered') {
      update.deliveredAt = now
      update.deliveryStatus = 'delivered'
      update.deliveryMethod = 'provider'
    }
    if (params.status !== 'delivered') update.failedAt = now

    await SmsMessage.updateOne({ _id: params.messageId }, { $set: update })
  }

  /** Reschedule a still-pending message and release the lease. */
  async reschedule(params: {
    messageId: mongoose.Types.ObjectId | string
    status: SmsStatus
    nextCheckAt: Date
    providerStatusRaw?: string
    cause?: string
    providerError?: string
    now?: Date
  }): Promise<void> {
    const now = params.now ?? new Date()
    const update: Record<string, any> = {
      status: params.status,
      lastCheckedAt: now,
      nextCheckAt: params.nextCheckAt,
      statusCheckLockedUntil: null,
      statusCheckWorkerId: null,
    }
    if (params.providerStatusRaw !== undefined) update.providerStatus = params.providerStatusRaw
    if (params.cause !== undefined) update.deliveryCause = params.cause
    if (params.providerError !== undefined) update.providerError = params.providerError

    await SmsMessage.updateOne({ _id: params.messageId }, { $set: update })
  }

  /**
   * Release a lease without recording a check (used when the provider is
   * unreachable / circuit open, so the attempt shouldn't burn schedule slots).
   */
  async release(params: {
    messageId: mongoose.Types.ObjectId | string
    nextCheckAt: Date
    providerError?: string
  }): Promise<void> {
    const update: Record<string, any> = {
      statusCheckLockedUntil: null,
      statusCheckWorkerId: null,
      nextCheckAt: params.nextCheckAt,
    }
    if (params.providerError !== undefined) update.providerError = params.providerError
    await SmsMessage.updateOne({ _id: params.messageId }, { $set: update })
  }

  /**
   * Refund credits for a failed message, guarded by the `refunded` flag so a
   * message can never be refunded twice (findOneAndUpdate is atomic).
   * Returns true if the refund was applied by this call.
   */
  async refundIfNeeded(params: {
    messageId: mongoose.Types.ObjectId | string
    userId: mongoose.Types.ObjectId
    credits: number
  }): Promise<boolean> {
    const marked = await SmsMessage.findOneAndUpdate(
      { _id: params.messageId, refunded: { $ne: true } },
      { $set: { refunded: true } },
      { new: false }
    ).lean()

    if (!marked) return false

    await User.updateOne({ _id: params.userId }, { $inc: { creditsBalance: params.credits } })
    return true
  }

  /** Find a message by provider message ID (DLR webhook / manual lookup). */
  async findByProviderMessageId(providerMessageId: string): Promise<ISmsMessage | null> {
    return SmsMessage.findOne({
      $or: [{ hpTransactionId: providerMessageId }, { externalMsgId: providerMessageId }],
    }).lean<ISmsMessage>()
  }

  /** Count messages currently due for a check (ops/monitoring). */
  async countDue(now: Date = new Date()): Promise<number> {
    return SmsMessage.countDocuments({
      status: { $in: [...SMS_PENDING_STATUSES] },
      nextCheckAt: { $lte: now },
    })
  }
}

export const statusRepository = new StatusRepository()

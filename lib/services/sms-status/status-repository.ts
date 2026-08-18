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
import { queueLowBalanceAlertSync } from '@/lib/services/sms/low-balance-alert'
export interface ClaimedMessage {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: SmsStatus
  /** HostPinnacle Message ID (uuid) — preferred for status API */
  externalMsgId: string | null
  /** HostPinnacle Transaction ID — used by DLR webhooks */
  hpTransactionId: string | null
  providerMessageId: string | null
  statusCheckAttempts: number
  segments: number
  refunded: boolean
  sentAt: Date | null
  createdAt: Date
  toNumbers: string[]
  senderName: string
  awaitingProviderConfirmation?: boolean
  source?: string
}

function toClaimedMessage(doc: any): ClaimedMessage {
  const externalMsgId = doc.externalMsgId || null
  const hpTransactionId = doc.hpTransactionId || null
  return {
    _id: doc._id,
    userId: doc.userId,
    status: doc.status,
    externalMsgId,
    hpTransactionId,
    providerMessageId: externalMsgId || hpTransactionId || null,
    statusCheckAttempts: doc.statusCheckAttempts ?? 0,
    segments: doc.segments ?? 1,
    refunded: doc.refunded ?? false,
    sentAt: doc.sentAt ?? null,
    createdAt: doc.createdAt,
    toNumbers: doc.toNumbers ?? [],
    senderName: doc.senderName ?? '',
    awaitingProviderConfirmation: !!doc.awaitingProviderConfirmation,
    source: doc.source,
  }
}

function claimLeaseFilter(now: Date) {
  return {
    $or: [{ statusCheckLockedUntil: null }, { statusCheckLockedUntil: { $lte: now } }],
  }
}

export class StatusRepository {
  /**
   * Atomically claim up to `batchSize` due pending messages for `workerId`.
   *
   * Also claims auto-mark rows still awaiting HostPinnacle confirmation
   * (status may already be 'delivered' but nextCheckAt is due).
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
    const claimedIds = new Set<string>()

    const claimOne = async (filter: Record<string, unknown>) => {
      const doc = await SmsMessage.findOneAndUpdate(
        filter,
        {
          $set: {
            statusCheckLockedUntil: lockUntil,
            statusCheckWorkerId: params.workerId,
          },
          $inc: { statusCheckAttempts: 1 },
        },
        {
          sort: { nextCheckAt: 1 },
          new: true,
        }
      ).lean()
      if (!doc) return null
      const id = String(doc._id)
      if (claimedIds.has(id)) return null
      claimedIds.add(id)
      return toClaimedMessage(doc)
    }

    // Prefer classic pending statuses first, then auto-mark verification rows.
    while (claimed.length < params.batchSize) {
      const pending = await claimOne({
        status: { $in: [...SMS_PENDING_STATUSES] },
        nextCheckAt: { $lte: now },
        ...claimLeaseFilter(now),
      })
      if (!pending) break
      claimed.push(pending)
    }

    while (claimed.length < params.batchSize) {
      const verifying = await claimOne({
        awaitingProviderConfirmation: true,
        nextCheckAt: { $lte: now },
        ...claimLeaseFilter(now),
      })
      if (!verifying) break
      claimed.push(verifying)
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
      awaitingProviderConfirmation: false,
    }
    if (params.providerStatusRaw !== undefined) update.providerStatus = params.providerStatusRaw
    if (params.cause !== undefined) update.deliveryCause = params.cause
    if (params.errorMessage !== undefined) update.errorMessage = params.errorMessage
    if (params.status === 'delivered') {
      update.deliveredAt = now
      update.deliveryStatus = 'delivered'
      update.deliveryMethod = 'provider'
      update.failedAt = null
    } else {
      // HostPinnacle may later correct a wrong "delivered" — clear delivery stamp
      update.failedAt = now
      update.deliveredAt = null
      update.deliveryStatus = params.status
    }

    await SmsMessage.updateOne({ _id: params.messageId }, { $set: update })
  }

  /**
   * Keep showing delivered (auto-mark) while HostPinnacle still reports pending.
   * Does not change status away from delivered.
   */
  async rescheduleVerification(params: {
    messageId: mongoose.Types.ObjectId | string
    nextCheckAt: Date
    providerStatusRaw?: string
    cause?: string
    providerError?: string
    now?: Date
  }): Promise<void> {
    const now = params.now ?? new Date()
    const update: Record<string, any> = {
      // Keep UI on delivered while we verify
      status: 'delivered',
      awaitingProviderConfirmation: true,
      lastCheckedAt: now,
      nextCheckAt: params.nextCheckAt,
      statusCheckLockedUntil: null,
      statusCheckWorkerId: null,
      finalizedAt: null,
    }
    if (params.providerStatusRaw !== undefined) update.providerStatus = params.providerStatusRaw
    if (params.cause !== undefined) update.deliveryCause = params.cause
    if (params.providerError !== undefined) update.providerError = params.providerError

    await SmsMessage.updateOne({ _id: params.messageId }, { $set: update })
  }

  /** Stop verifying an auto-mark row without changing the shown delivered status. */
  async stopVerificationKeepDelivered(params: {
    messageId: mongoose.Types.ObjectId | string
    now?: Date
    providerError?: string
  }): Promise<void> {
    const now = params.now ?? new Date()
    const update: Record<string, any> = {
      status: 'delivered',
      awaitingProviderConfirmation: false,
      finalizedAt: now,
      lastCheckedAt: now,
      nextCheckAt: null,
      statusCheckLockedUntil: null,
      statusCheckWorkerId: null,
    }
    if (params.providerError !== undefined) update.providerError = params.providerError
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
      { $set: { refunded: true, profitKes: 0 } },
      { new: false }
    ).lean()

    if (!marked) return false

    await User.updateOne({ _id: params.userId }, { $inc: { creditsBalance: params.credits } })
    queueLowBalanceAlertSync(params.userId)
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
      $or: [
        { status: { $in: [...SMS_PENDING_STATUSES] }, nextCheckAt: { $lte: now } },
        { awaitingProviderConfirmation: true, nextCheckAt: { $lte: now } },
      ],
    })
  }
}

export const statusRepository = new StatusRepository()

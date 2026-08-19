/**
 * SmsStatusSynchronizer - the single synchronization service shared by:
 *   - the Render background worker (continuous polling)
 *   - admin manual "Sync Status" (super-admin settings page)
 *   - HostPinnacle DLR webhooks (applyProviderStatus)
 *
 * There must never be a second copy of this logic anywhere.
 */

import mongoose from 'mongoose'
import type { HostPinnacleStatusClient } from '@/lib/services/hostpinnacle/status-client'
import type { Logger } from '@/lib/worker/logger'
import { RetryScheduler } from './retry-scheduler'
import { StatusRepository, type ClaimedMessage } from './status-repository'
import { mapProviderStatus, isFinalStatus } from './status-mapper'
import { notifyDeliveryFailureAlert } from './failure-alert'
import { MANUAL_COMPLETED_CAUSE, isManuallyCompleted } from '@/lib/services/sms-history/actionable'

/** Final failure statuses that trigger a credit refund (business rule carried
 *  over from the previous implementation). provider_timeout is excluded on
 *  purpose: the outcome is unknown, so we do not give money back automatically. */
const REFUNDABLE_FINAL_STATUSES = new Set(['failed', 'expired', 'rejected', 'undeliverable'])

/** HostPinnacle cause for which credits are kept even on failure (existing rule) */
const NON_REFUNDABLE_CAUSE = 'user has blacklisted sender id'

export interface SynchronizerOptions {
  client: HostPinnacleStatusClient
  repository: StatusRepository
  scheduler: RetryScheduler
  logger: Logger
  workerConcurrency: number
}

export class SmsStatusSynchronizer {
  private readonly client: HostPinnacleStatusClient
  private readonly repository: StatusRepository
  private readonly scheduler: RetryScheduler
  private readonly logger: Logger
  private readonly concurrency: number

  constructor(options: SynchronizerOptions) {
    this.client = options.client
    this.repository = options.repository
    this.scheduler = options.scheduler
    this.logger = options.logger
    this.concurrency = Math.max(1, options.workerConcurrency)
  }

  /**
   * Claim a batch of due pending messages and synchronize each of them.
   * Used by both the background worker loop and the admin manual sync.
   */
  async syncBatch(params: {
    workerId: string
    batchSize: number
    leaseSeconds: number
  }): Promise<SyncBatchSummary> {
    const summary: SyncBatchSummary = {
      claimed: 0,
      finalized: 0,
      rescheduled: 0,
      timedOut: 0,
      errors: 0,
    }

    const claimed = await this.repository.claimDueMessages(params)
    summary.claimed = claimed.length
    if (claimed.length === 0) return summary

    // Bounded-concurrency pool over individual lookups (HostPinnacle has no
    // batch status API); the client's rate limiter caps provider throughput.
    let cursor = 0
    const runners = Array.from({ length: Math.min(this.concurrency, claimed.length) }, async () => {
      while (cursor < claimed.length) {
        const message = claimed[cursor++]
        try {
          const outcome = await this.syncClaimedMessage(message)
          summary[outcome] += 1
        } catch (error) {
          // One failed message must never stop the batch.
          summary.errors += 1
          this.logger.error('Unexpected error while syncing message', {
            messageId: message._id.toString(),
            error,
          })
          await this.repository
            .release({
              messageId: message._id,
              nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts),
              providerError: error instanceof Error ? error.message : String(error),
            })
            .catch(() => {})
        }
      }
    })
    await Promise.all(runners)

    return summary
  }

  /**
   * Synchronize one claimed message against the provider.
   * Returns which summary bucket the outcome belongs to.
   */
  async syncClaimedMessage(
    message: ClaimedMessage
  ): Promise<'finalized' | 'rescheduled' | 'timedOut' | 'errors'> {
    const now = new Date()

    if (isManuallyCompleted(message)) {
      await this.repository.stopVerificationKeepDelivered({
        messageId: message._id,
        now,
        providerError: 'Left completed after user marked it done',
      })
      return 'finalized'
    }

    // Give up permanently once the message is too old to ever resolve.
    if (this.scheduler.hasTimedOut(message.sentAt, message.createdAt, now)) {
      // Auto-mark verification: keep showing Delivered rather than "provider_timeout"
      // after the poll window ends without a HostPinnacle FAILED.
      if (message.awaitingProviderConfirmation || message.status === 'delivered') {
        await this.repository.stopVerificationKeepDelivered({
          messageId: message._id,
          now,
          providerError: 'Stopped verifying after timeout; no HostPinnacle FAILED received',
        })
        this.logger.info('auto-mark verification stopped (timeout); kept delivered', {
          messageId: message._id.toString(),
        })
        return 'timedOut'
      }
      await this.repository.markFinal({
        messageId: message._id,
        status: 'provider_timeout',
        errorMessage: 'No final delivery status from provider within the configured timeout',
        now,
      })
      this.logger.info('message marked provider_timeout', { messageId: message._id.toString() })
      return 'timedOut'
    }

    // Without a provider message ID there is nothing to look up yet
    // (the async send may not have recorded it). Retry later.
    if (!message.externalMsgId && !message.hpTransactionId && !message.providerMessageId) {
      await this.repository.reschedule({
        messageId: message._id,
        status: 'retrying',
        nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
        providerError: 'Missing provider message ID',
        now,
      })
      return 'rescheduled'
    }

    const lookupIds = [
      ...new Set(
        [message.externalMsgId, message.hpTransactionId, message.providerMessageId].filter(
          Boolean
        ) as string[]
      ),
    ]

    let lookup: Awaited<ReturnType<HostPinnacleStatusClient['getMessageStatus']>> | null = null
    for (const id of lookupIds) {
      const attempt = await this.client.getMessageStatus(id)
      if (attempt.ok && attempt.result) {
        lookup = attempt
        break
      }
      if (attempt.ok && !lookup) {
        lookup = attempt
      } else if (!lookup) {
        lookup = attempt
      }
    }

    if (!lookup) {
      await this.repository.release({
        messageId: message._id,
        nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
        providerError: 'No lookup IDs available',
      })
      return 'errors'
    }

    if (!lookup.ok) {
      // Provider unreachable / rate limited / circuit open: release the lease
      // and try again later. Do not crash, do not finalize.
      await this.repository.release({
        messageId: message._id,
        nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
        providerError: `${lookup.error.kind}: ${lookup.error.message}`,
      })
      this.logger.warn('provider lookup failed; message released', {
        messageId: message._id.toString(),
        errorKind: lookup.error.kind,
      })
      return 'errors'
    }

    if (!lookup.result) {
      // Provider has no report yet - normal shortly after sending.
      if (message.awaitingProviderConfirmation || message.status === 'delivered') {
        await this.repository.rescheduleVerification({
          messageId: message._id,
          nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
          providerStatusRaw: 'NO_REPORT',
          now,
        })
        return 'rescheduled'
      }
      await this.repository.reschedule({
        messageId: message._id,
        status: 'retrying',
        nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
        providerStatusRaw: 'NO_REPORT',
        now,
      })
      return 'rescheduled'
    }

    return this.applyStatusResult(message, lookup.result, now)
  }

  /**
   * Apply an authoritative provider status to a message. This is the entry
   * point future HostPinnacle webhooks should call:
   *
   *   webhook route -> synchronizer.applyProviderStatus(providerMessageId, rawStatus, cause)
   */
  async applyProviderStatus(
    providerMessageId: string,
    providerStatusRaw: string,
    cause?: string
  ): Promise<{ applied: boolean; status?: string }> {
    const doc = await this.repository.findByProviderMessageId(providerMessageId)
    if (!doc) {
      this.logger.warn('applyProviderStatus: no message for provider ID', { providerMessageId })
      return { applied: false }
    }

    const result = mapProviderStatus(providerStatusRaw, cause)

    if (isManuallyCompleted(doc)) {
      this.logger.info('applyProviderStatus: ignored update for manually completed message', {
        providerMessageId,
        incomingStatus: result.status,
      })
      return { applied: false, status: doc.status }
    }

    // Guard against out-of-order updates: once a message is final, a late
    // pending report (e.g. a delayed SUBMITTED DLR after DELIVERED) must not
    // resurrect it — unless we are still verifying an auto-mark. A late
    // *final* report is always applied (FAILED must override Delivered).
    if (
      isFinalStatus(doc.status) &&
      !result.isFinal &&
      !doc.awaitingProviderConfirmation
    ) {
      this.logger.info('applyProviderStatus: ignored pending update for final message', {
        providerMessageId,
        currentStatus: doc.status,
        incomingStatus: result.status,
      })
      return { applied: false, status: doc.status }
    }
    const message: ClaimedMessage = {
      _id: doc._id as unknown as mongoose.Types.ObjectId,
      userId: doc.userId,
      status: doc.status,
      externalMsgId: doc.externalMsgId || null,
      hpTransactionId: doc.hpTransactionId || null,
      providerMessageId: doc.externalMsgId || doc.hpTransactionId || providerMessageId,
      statusCheckAttempts: doc.statusCheckAttempts ?? 0,
      segments: doc.segments ?? 1,
      refunded: doc.refunded ?? false,
      sentAt: doc.sentAt ?? null,
      createdAt: doc.createdAt,
      toNumbers: doc.toNumbers ?? [],
      senderName: doc.senderName,
      awaitingProviderConfirmation: !!doc.awaitingProviderConfirmation,
      source: doc.source,
      deliveryCause: doc.deliveryCause || null,
    }

    const outcome = await this.applyStatusResult(message, result, new Date())
    return { applied: true, status: result.status }
  }

  /** Apply status when the DB row is already matched (e.g. DLR found message by phone). */
  async applyStatusToMessageId(
    messageId: string,
    providerStatusRaw: string,
    cause?: string
  ): Promise<{ applied: boolean; status?: string }> {
    const { SmsMessage } = await import('@/lib/db/models')
    const doc = await SmsMessage.findById(messageId).lean()
    if (!doc) return { applied: false }

    const result = mapProviderStatus(providerStatusRaw, cause)
    if (isManuallyCompleted(doc)) {
      return { applied: false, status: doc.status }
    }
    if (
      isFinalStatus(doc.status) &&
      !result.isFinal &&
      !doc.awaitingProviderConfirmation
    ) {
      return { applied: false, status: doc.status }
    }

    const message: ClaimedMessage = {
      _id: doc._id as unknown as mongoose.Types.ObjectId,
      userId: doc.userId as mongoose.Types.ObjectId,
      status: doc.status,
      externalMsgId: doc.externalMsgId || null,
      hpTransactionId: doc.hpTransactionId || null,
      providerMessageId: doc.externalMsgId || doc.hpTransactionId || null,
      statusCheckAttempts: doc.statusCheckAttempts ?? 0,
      segments: doc.segments ?? 1,
      refunded: doc.refunded ?? false,
      sentAt: doc.sentAt ?? null,
      createdAt: doc.createdAt,
      toNumbers: doc.toNumbers ?? [],
      senderName: doc.senderName ?? '',
      awaitingProviderConfirmation: !!doc.awaitingProviderConfirmation,
      source: doc.source,
      deliveryCause: doc.deliveryCause || null,
    }

    await this.applyStatusResult(message, result, new Date())
    return { applied: true, status: result.status }
  }

  private async applyStatusResult(
    message: ClaimedMessage,
    result: ProviderStatusResult,
    now: Date
  ): Promise<'finalized' | 'rescheduled'> {
    if (isManuallyCompleted(message)) {
      return 'finalized'
    }
    if (result.isFinal) {
      const previousStatus = message.status
      await this.repository.markFinal({
        messageId: message._id,
        status: result.status,
        providerStatusRaw: result.providerStatusRaw,
        cause: result.cause,
        errorMessage:
          result.status === 'delivered'
            ? undefined
            : result.cause || `Final provider status: ${result.providerStatusRaw}`,
        now,
      })

      if (
        REFUNDABLE_FINAL_STATUSES.has(result.status) &&
        !message.refunded &&
        !(result.cause ?? '').toLowerCase().includes(NON_REFUNDABLE_CAUSE)
      ) {
        const refunded = await this.repository.refundIfNeeded({
          messageId: message._id,
          userId: message.userId,
          credits: message.segments,
        })
        if (refunded) {
          this.logger.info('credits refunded for failed message', {
            messageId: message._id.toString(),
            credits: message.segments,
          })
        }
      }

      if (REFUNDABLE_FINAL_STATUSES.has(result.status)) {
        // Fire-and-forget — never block the status pipeline on alert SMS.
        void notifyDeliveryFailureAlert({
          messageId: message._id,
          status: result.status,
          toNumbers: message.toNumbers,
          senderName: message.senderName,
          cause: result.cause || result.providerStatusRaw,
          previousStatus,
          source: message.source,
        })
      }

      this.logger.info('message finalized', {
        messageId: message._id.toString(),
        status: result.status,
        providerStatus: result.providerStatusRaw,
        previousStatus,
      })
      return 'finalized'
    }

    // Auto-mark: keep UI on Delivered while HostPinnacle still says pending.
    if (message.awaitingProviderConfirmation || message.status === 'delivered') {
      await this.repository.rescheduleVerification({
        messageId: message._id,
        nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
        providerStatusRaw: result.providerStatusRaw,
        cause: result.cause,
        now,
      })
      return 'rescheduled'
    }

    await this.repository.reschedule({
      messageId: message._id,
      status: result.status,
      nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
      providerStatusRaw: result.providerStatusRaw,
      cause: result.cause,
      now,
    })
    return 'rescheduled'
  }
}

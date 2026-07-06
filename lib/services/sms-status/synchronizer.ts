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
import type { ProviderStatusResult, SyncBatchSummary } from './types'

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

    // Give up permanently once the message is too old to ever resolve.
    if (this.scheduler.hasTimedOut(message.sentAt, message.createdAt, now)) {
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
    if (!message.providerMessageId) {
      await this.repository.reschedule({
        messageId: message._id,
        status: 'retrying',
        nextCheckAt: this.scheduler.nextCheckAt(message.statusCheckAttempts, now),
        providerError: 'Missing provider message ID',
        now,
      })
      return 'rescheduled'
    }

    const lookup = await this.client.getMessageStatus(message.providerMessageId)

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

    // Guard against out-of-order updates: once a message is final, a late
    // pending report (e.g. a delayed SUBMITTED DLR after DELIVERED) must not
    // resurrect it. A late *final* report is still applied because the
    // provider is authoritative for terminal outcomes (e.g. a DELIVERED
    // webhook arriving after the worker gave up with provider_timeout).
    if (isFinalStatus(doc.status) && !result.isFinal) {
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
      providerMessageId,
      statusCheckAttempts: doc.statusCheckAttempts ?? 0,
      segments: doc.segments ?? 1,
      refunded: doc.refunded ?? false,
      sentAt: doc.sentAt ?? null,
      createdAt: doc.createdAt,
      toNumbers: doc.toNumbers ?? [],
      senderName: doc.senderName,
    }

    const outcome = await this.applyStatusResult(message, result, new Date())
    return { applied: true, status: result.status }
  }

  private async applyStatusResult(
    message: ClaimedMessage,
    result: ProviderStatusResult,
    now: Date
  ): Promise<'finalized' | 'rescheduled'> {
    if (result.isFinal) {
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

      this.logger.info('message finalized', {
        messageId: message._id.toString(),
        status: result.status,
        providerStatus: result.providerStatusRaw,
      })
      return 'finalized'
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

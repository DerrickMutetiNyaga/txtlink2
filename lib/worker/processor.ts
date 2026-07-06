/**
 * WorkerProcessor - the background worker's main loop.
 *
 * Repeats forever until asked to stop:
 *   1. claim a batch of due pending SMS (atomic lease-based claiming)
 *   2. check each against HostPinnacle (bounded concurrency + rate limit)
 *   3. update MongoDB immediately (final status or rescheduled nextCheckAt)
 *   4. sleep briefly when there is no work
 *
 * Any error in a cycle is logged and the loop continues - the worker never
 * crashes because of a provider outage or a bad message.
 */

import type { SmsStatusConfig } from '@/lib/config/sms-status-config'
import type { Logger } from '@/lib/worker/logger'
import type { SmsStatusSynchronizer } from '@/lib/services/sms-status/synchronizer'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class WorkerProcessor {
  private readonly synchronizer: SmsStatusSynchronizer
  private readonly config: SmsStatusConfig
  private readonly logger: Logger
  private stopping = false
  private stopResolvers: Array<() => void> = []

  constructor(params: {
    synchronizer: SmsStatusSynchronizer
    config: SmsStatusConfig
    logger: Logger
  }) {
    this.synchronizer = params.synchronizer
    this.config = params.config
    this.logger = params.logger
  }

  /** Ask the loop to finish the current batch and exit. */
  stop(): void {
    this.stopping = true
    for (const resolve of this.stopResolvers.splice(0)) resolve()
  }

  /** Sleep that wakes early when stop() is called. */
  private async interruptibleSleep(ms: number): Promise<void> {
    if (this.stopping) return
    await Promise.race([
      sleep(ms),
      new Promise<void>((resolve) => this.stopResolvers.push(resolve)),
    ])
  }

  async run(): Promise<void> {
    this.logger.info('worker started', {
      batchSize: this.config.batchSize,
      pollIntervalMs: this.config.pollIntervalMs,
      claimLeaseSeconds: this.config.claimLeaseSeconds,
      workerConcurrency: this.config.workerConcurrency,
      rateLimitPerSecond: this.config.rateLimitPerSecond,
    })

    while (!this.stopping) {
      const cycleStart = Date.now()
      try {
        const summary = await this.synchronizer.syncBatch({
          workerId: this.config.workerId,
          batchSize: this.config.batchSize,
          leaseSeconds: this.config.claimLeaseSeconds,
        })

        if (summary.claimed > 0) {
          this.logger.info('cycle complete', {
            ...summary,
            durationMs: Date.now() - cycleStart,
          })
          // More work may be waiting; only pause briefly between full batches.
          if (summary.claimed >= this.config.batchSize) {
            continue
          }
        } else {
          this.logger.debug('no due messages')
        }
      } catch (error) {
        this.logger.error('worker cycle failed', { error })
      }

      await this.interruptibleSleep(this.config.pollIntervalMs)
    }

    this.logger.info('worker stopped')
  }
}

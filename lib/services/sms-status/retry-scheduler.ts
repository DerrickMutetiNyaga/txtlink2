/**
 * RetryScheduler - decides when a still-pending message should be checked next.
 *
 * Uses a configurable backoff schedule (RETRY_INTERVALS_SECONDS). Once the
 * schedule is exhausted the last interval repeats, until the message exceeds
 * PROVIDER_FINAL_TIMEOUT_HOURS since sending, at which point it is marked
 * `provider_timeout` and never checked again.
 */

export interface RetrySchedulerOptions {
  /** Backoff schedule in seconds, indexed by completed attempt count */
  retryIntervalsSeconds: number[]
  /** Hours after sending at which a still-pending message becomes provider_timeout */
  providerFinalTimeoutHours: number
}

export class RetryScheduler {
  private readonly intervals: number[]
  private readonly finalTimeoutMs: number

  constructor(options: RetrySchedulerOptions) {
    if (options.retryIntervalsSeconds.length === 0) {
      throw new Error('retryIntervalsSeconds must not be empty')
    }
    this.intervals = options.retryIntervalsSeconds
    this.finalTimeoutMs = options.providerFinalTimeoutHours * 60 * 60 * 1000
  }

  /** Interval (seconds) to wait after `attempts` completed checks. */
  intervalForAttempt(attempts: number): number {
    const index = Math.min(Math.max(attempts, 0), this.intervals.length - 1)
    return this.intervals[index]
  }

  /** The initial delay before the very first status check after sending. */
  initialCheckDelaySeconds(): number {
    return this.intervals[0]
  }

  /** When the next check should happen, given completed attempts. */
  nextCheckAt(attempts: number, now: Date = new Date()): Date {
    return new Date(now.getTime() + this.intervalForAttempt(attempts) * 1000)
  }

  /** nextCheckAt for a message that was just sent (attempt 0 schedule). */
  initialNextCheckAt(now: Date = new Date()): Date {
    return new Date(now.getTime() + this.initialCheckDelaySeconds() * 1000)
  }

  /**
   * Whether a message has been pending long enough to be declared
   * provider_timeout. `sentAt` falls back to createdAt when missing.
   */
  hasTimedOut(sentAt: Date | null | undefined, createdAt: Date, now: Date = new Date()): boolean {
    const reference = sentAt ?? createdAt
    return now.getTime() - reference.getTime() >= this.finalTimeoutMs
  }
}

/**
 * Token-bucket rate limiter.
 *
 * Callers await acquire() before making a provider request. Tokens refill
 * continuously at `ratePerSecond`, with a burst capacity of one second's
 * worth of tokens.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class RateLimiter {
  private readonly ratePerSecond: number
  private readonly capacity: number
  private tokens: number
  private lastRefill: number

  constructor(ratePerSecond: number) {
    if (ratePerSecond <= 0) throw new Error('ratePerSecond must be > 0')
    this.ratePerSecond = ratePerSecond
    this.capacity = ratePerSecond
    this.tokens = ratePerSecond
    this.lastRefill = Date.now()
  }

  private refill(now: number): void {
    const elapsedSeconds = (now - this.lastRefill) / 1000
    if (elapsedSeconds > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.ratePerSecond)
      this.lastRefill = now
    }
  }

  /** Resolves once a token is available. */
  async acquire(): Promise<void> {
    // Loop instead of recursing so long waits under contention stay flat.
    for (;;) {
      const now = Date.now()
      this.refill(now)
      if (this.tokens >= 1) {
        this.tokens -= 1
        return
      }
      const deficit = 1 - this.tokens
      const waitMs = Math.max(5, Math.ceil((deficit / this.ratePerSecond) * 1000))
      await sleep(waitMs)
    }
  }
}

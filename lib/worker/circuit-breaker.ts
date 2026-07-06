/**
 * Circuit breaker for the HostPinnacle provider API.
 *
 * - closed: requests flow normally
 * - open: after N consecutive failures, all requests are rejected until the
 *   cooldown elapses (protects the provider and stops wasted work)
 * - half-open: after the cooldown, a limited number of probe requests are
 *   allowed; success closes the circuit, failure re-opens it
 */

export type CircuitState = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private readonly failureThreshold: number
  private readonly cooldownMs: number
  private consecutiveFailures = 0
  private state: CircuitState = 'closed'
  private openedAt = 0
  private readonly now: () => number

  constructor(options: { failureThreshold: number; cooldownMs: number; now?: () => number }) {
    this.failureThreshold = options.failureThreshold
    this.cooldownMs = options.cooldownMs
    this.now = options.now ?? Date.now
  }

  getState(): CircuitState {
    if (this.state === 'open' && this.now() - this.openedAt >= this.cooldownMs) {
      this.state = 'half-open'
    }
    return this.state
  }

  /** Whether a request may be attempted right now. */
  canRequest(): boolean {
    return this.getState() !== 'open'
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0
    this.state = 'closed'
  }

  recordFailure(): void {
    this.consecutiveFailures += 1
    if (this.state === 'half-open' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'open'
      this.openedAt = this.now()
    }
  }
}

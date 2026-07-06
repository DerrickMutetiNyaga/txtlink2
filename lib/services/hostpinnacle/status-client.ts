/**
 * HostPinnacleStatusClient - production-grade client for the HostPinnacle
 * delivery-status API (/SMSApi/report/status).
 *
 * Features:
 *  - request timeout (AbortSignal)
 *  - bounded retries with exponential backoff + jitter
 *  - HTTP 429 handling (honors Retry-After when present)
 *  - HTTP 5xx handling
 *  - token-bucket rate limiting
 *  - circuit breaker (stops hammering the provider during an outage)
 *  - structured error classification (never throws for provider failures)
 *
 * HostPinnacle only supports single-message status lookup (one uuid per
 * request), so batching is achieved by the caller running lookups with
 * bounded concurrency on top of this client's rate limiter.
 */

import { RateLimiter } from '@/lib/worker/rate-limiter'
import { CircuitBreaker } from '@/lib/worker/circuit-breaker'
import type { Logger } from '@/lib/worker/logger'
import { parseProviderStatusResponse } from '@/lib/services/sms-status/status-mapper'
import type { ProviderLookup, ProviderLookupError } from '@/lib/services/sms-status/types'

export interface HostPinnacleStatusClientConfig {
  baseUrl: string
  statusEndpoint: string
  userId?: string
  password?: string
  apiKey?: string
  timeoutMs: number
  maxRetries: number
  rateLimitPerSecond: number
  circuitBreakerFailureThreshold: number
  circuitBreakerCooldownMs: number
}

type FetchLike = typeof fetch

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class HostPinnacleStatusClient {
  private readonly config: HostPinnacleStatusClientConfig
  private readonly rateLimiter: RateLimiter
  private readonly circuitBreaker: CircuitBreaker
  private readonly fetchImpl: FetchLike
  private readonly logger?: Logger

  constructor(
    config: HostPinnacleStatusClientConfig,
    options: { fetchImpl?: FetchLike; logger?: Logger } = {}
  ) {
    this.config = config
    this.rateLimiter = new RateLimiter(config.rateLimitPerSecond)
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerFailureThreshold,
      cooldownMs: config.circuitBreakerCooldownMs,
    })
    this.fetchImpl = options.fetchImpl ?? fetch
    this.logger = options.logger
  }

  getCircuitState() {
    return this.circuitBreaker.getState()
  }

  /**
   * Look up delivery status for one provider message ID (uuid).
   * Never throws for provider-side problems; returns a classified error instead.
   */
  async getMessageStatus(uuid: string): Promise<ProviderLookup> {
    if (!this.circuitBreaker.canRequest()) {
      return {
        ok: false,
        error: { kind: 'circuit_open', message: 'Circuit breaker open - provider marked unavailable' },
      }
    }

    let lastError: ProviderLookupError = { kind: 'network', message: 'No attempts made' }

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter: 500ms, 1s, 2s ... capped at 10s
        const backoff = Math.min(500 * 2 ** (attempt - 1), 10_000)
        await sleep(backoff + Math.floor(Math.random() * 250))
        if (!this.circuitBreaker.canRequest()) {
          return {
            ok: false,
            error: { kind: 'circuit_open', message: 'Circuit breaker opened during retries' },
          }
        }
      }

      await this.rateLimiter.acquire()
      const outcome = await this.requestOnce(uuid)

      if (outcome.ok) {
        this.circuitBreaker.recordSuccess()
        return outcome
      }

      lastError = outcome.error

      // Invalid responses are not transient - do not retry, do not trip the breaker.
      if (outcome.error.kind === 'invalid_response') {
        return outcome
      }

      // Transient failures (timeout / 429 / 5xx / network) count against the breaker.
      this.circuitBreaker.recordFailure()
      this.logger?.warn('hostpinnacle status lookup failed', {
        uuid,
        attempt,
        errorKind: outcome.error.kind,
        errorMessage: outcome.error.message,
        httpStatus: outcome.error.httpStatus,
      })

      if (outcome.error.kind === 'rate_limited' && outcome.error.httpStatus === 429) {
        // Extra pause on 429 beyond normal backoff
        await sleep(1000)
      }
    }

    return { ok: false, error: lastError }
  }

  private async requestOnce(uuid: string): Promise<ProviderLookup> {
    const url = `${this.config.baseUrl}${this.config.statusEndpoint}`
    const form = new URLSearchParams()
    form.append('output', 'json')
    form.append('uuid', uuid)

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    if (this.config.apiKey) {
      headers['apiKey'] = this.config.apiKey
    }
    if (this.config.userId && this.config.password) {
      form.append('userid', this.config.userId)
      form.append('password', this.config.password)
    }

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: form.toString(),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      })
    } catch (error: any) {
      const isTimeout =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        /timeout|aborted/i.test(error?.message ?? '')
      return {
        ok: false,
        error: {
          kind: isTimeout ? 'timeout' : 'network',
          message: error?.message ?? 'Network error',
        },
      }
    }

    if (response.status === 429) {
      return {
        ok: false,
        error: { kind: 'rate_limited', message: 'Provider rate limit (HTTP 429)', httpStatus: 429 },
      }
    }
    if (response.status >= 500) {
      return {
        ok: false,
        error: {
          kind: 'server_error',
          message: `Provider server error (HTTP ${response.status})`,
          httpStatus: response.status,
        },
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        error: {
          kind: 'invalid_response',
          message: `Unexpected HTTP ${response.status}`,
          httpStatus: response.status,
        },
      }
    }

    let data: unknown
    const text = await response.text()
    try {
      data = JSON.parse(text)
    } catch {
      return {
        ok: false,
        error: {
          kind: 'invalid_response',
          message: `Provider returned non-JSON body: ${text.slice(0, 120)}`,
          httpStatus: response.status,
        },
      }
    }

    // parse -> ProviderStatusResult, or null when no report exists yet
    const result = parseProviderStatusResponse(data)
    return { ok: true, result }
  }
}

import { describe, it, expect, vi } from 'vitest'
import { HostPinnacleStatusClient } from '@/lib/services/hostpinnacle/status-client'
import { CircuitBreaker } from '@/lib/worker/circuit-breaker'
import { RateLimiter } from '@/lib/worker/rate-limiter'

function makeClient(fetchImpl: any, overrides: Record<string, any> = {}) {
  return new HostPinnacleStatusClient(
    {
      baseUrl: 'https://example.test',
      statusEndpoint: '/SMSApi/report/status',
      userId: 'user',
      password: 'pass',
      timeoutMs: 500,
      maxRetries: 2,
      rateLimitPerSecond: 1000,
      circuitBreakerFailureThreshold: 3,
      circuitBreakerCooldownMs: 60_000,
      ...overrides,
    },
    { fetchImpl }
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const DELIVERED_BODY = {
  response: { reports_statusList: [{ status: { Status: 'DELIVERED', Cause: 'Success' } }] },
}

describe('HostPinnacleStatusClient', () => {
  it('returns a parsed status on success', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(DELIVERED_BODY))
    const client = makeClient(fetchImpl)

    const lookup = await client.getMessageStatus('uuid-1')
    expect(lookup.ok).toBe(true)
    if (lookup.ok) {
      expect(lookup.result?.status).toBe('delivered')
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns ok with null result when the provider has no report yet', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ response: {} }))
    const client = makeClient(fetchImpl)

    const lookup = await client.getMessageStatus('uuid-2')
    expect(lookup.ok).toBe(true)
    if (lookup.ok) expect(lookup.result).toBeNull()
  })

  it('retries on 5xx and succeeds without throwing', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(DELIVERED_BODY))
    const client = makeClient(fetchImpl)

    const lookup = await client.getMessageStatus('uuid-3')
    expect(lookup.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('classifies 429 as rate_limited and retries', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 429))
    const client = makeClient(fetchImpl, { maxRetries: 1 })

    const lookup = await client.getMessageStatus('uuid-4')
    expect(lookup.ok).toBe(false)
    if (!lookup.ok) expect(lookup.error.kind).toBe('rate_limited')
    expect(fetchImpl).toHaveBeenCalledTimes(2) // initial + 1 retry
  })

  it('classifies timeouts without crashing', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'TimeoutError',
    })
    const fetchImpl = vi.fn(async () => {
      throw abortError
    })
    const client = makeClient(fetchImpl, { maxRetries: 0 })

    const lookup = await client.getMessageStatus('uuid-5')
    expect(lookup.ok).toBe(false)
    if (!lookup.ok) expect(lookup.error.kind).toBe('timeout')
  })

  it('does not retry invalid (non-JSON) responses', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>gateway error</html>', { status: 200 }))
    const client = makeClient(fetchImpl)

    const lookup = await client.getMessageStatus('uuid-6')
    expect(lookup.ok).toBe(false)
    if (!lookup.ok) expect(lookup.error.kind).toBe('invalid_response')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('opens the circuit breaker during a provider outage and short-circuits', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 503))
    const client = makeClient(fetchImpl, { maxRetries: 0, circuitBreakerFailureThreshold: 2 })

    // Two failing lookups trip the breaker (threshold 2)
    await client.getMessageStatus('a')
    await client.getMessageStatus('b')
    expect(client.getCircuitState()).toBe('open')

    // Third lookup must not hit the network at all
    const before = fetchImpl.mock.calls.length
    const lookup = await client.getMessageStatus('c')
    expect(lookup.ok).toBe(false)
    if (!lookup.ok) expect(lookup.error.kind).toBe('circuit_open')
    expect(fetchImpl.mock.calls.length).toBe(before)
  })
})

describe('CircuitBreaker', () => {
  it('transitions closed -> open -> half-open -> closed', () => {
    let now = 0
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, now: () => now })

    expect(breaker.getState()).toBe('closed')
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.getState()).toBe('open')
    expect(breaker.canRequest()).toBe(false)

    now = 1001 // cooldown elapsed
    expect(breaker.getState()).toBe('half-open')
    expect(breaker.canRequest()).toBe(true)

    breaker.recordSuccess()
    expect(breaker.getState()).toBe('closed')
  })

  it('re-opens immediately when a half-open probe fails', () => {
    let now = 0
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, now: () => now })
    breaker.recordFailure()
    breaker.recordFailure()
    now = 1001
    expect(breaker.getState()).toBe('half-open')
    breaker.recordFailure()
    expect(breaker.getState()).toBe('open')
  })
})

describe('RateLimiter', () => {
  it('caps throughput to the configured rate', async () => {
    const limiter = new RateLimiter(50) // 50/s -> burst of 50, then ~20ms per token
    const start = Date.now()
    for (let i = 0; i < 60; i++) {
      await limiter.acquire()
    }
    const elapsed = Date.now() - start
    // 50 burst tokens are instant; the remaining 10 need ~200ms of refill
    expect(elapsed).toBeGreaterThanOrEqual(150)
  })
})

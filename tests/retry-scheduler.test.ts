import { describe, it, expect } from 'vitest'
import { RetryScheduler } from '@/lib/services/sms-status/retry-scheduler'

const INTERVALS = [30, 120, 300, 900, 1800, 3600, 10800, 21600, 43200, 86400]

function makeScheduler(overrides: Partial<{ intervals: number[]; timeoutHours: number }> = {}) {
  return new RetryScheduler({
    retryIntervalsSeconds: overrides.intervals ?? INTERVALS,
    providerFinalTimeoutHours: overrides.timeoutHours ?? 72,
  })
}

describe('RetryScheduler', () => {
  it('rejects an empty schedule', () => {
    expect(
      () => new RetryScheduler({ retryIntervalsSeconds: [], providerFinalTimeoutHours: 72 })
    ).toThrow()
  })

  it('uses the first interval for the initial check after sending', () => {
    const scheduler = makeScheduler()
    const now = new Date('2026-07-06T00:00:00Z')
    expect(scheduler.initialNextCheckAt(now).getTime()).toBe(now.getTime() + 30_000)
  })

  it('walks the backoff schedule by attempt count', () => {
    const scheduler = makeScheduler()
    expect(scheduler.intervalForAttempt(0)).toBe(30)
    expect(scheduler.intervalForAttempt(1)).toBe(120)
    expect(scheduler.intervalForAttempt(4)).toBe(1800)
    expect(scheduler.intervalForAttempt(9)).toBe(86400)
  })

  it('repeats the last interval once the schedule is exhausted', () => {
    const scheduler = makeScheduler()
    expect(scheduler.intervalForAttempt(10)).toBe(86400)
    expect(scheduler.intervalForAttempt(500)).toBe(86400)
  })

  it('clamps negative attempts to the first interval', () => {
    const scheduler = makeScheduler()
    expect(scheduler.intervalForAttempt(-3)).toBe(30)
  })

  it('computes nextCheckAt relative to now', () => {
    const scheduler = makeScheduler()
    const now = new Date('2026-07-06T00:00:00Z')
    expect(scheduler.nextCheckAt(2, now).getTime()).toBe(now.getTime() + 300_000)
  })

  it('detects provider timeout based on sentAt', () => {
    const scheduler = makeScheduler({ timeoutHours: 72 })
    const sentAt = new Date('2026-07-01T00:00:00Z')
    const created = new Date('2026-07-01T00:00:00Z')
    const before = new Date('2026-07-03T23:59:00Z') // < 72h
    const after = new Date('2026-07-04T00:01:00Z') // > 72h
    expect(scheduler.hasTimedOut(sentAt, created, before)).toBe(false)
    expect(scheduler.hasTimedOut(sentAt, created, after)).toBe(true)
  })

  it('falls back to createdAt when sentAt is missing', () => {
    const scheduler = makeScheduler({ timeoutHours: 1 })
    const created = new Date('2026-07-06T00:00:00Z')
    expect(scheduler.hasTimedOut(null, created, new Date('2026-07-06T00:30:00Z'))).toBe(false)
    expect(scheduler.hasTimedOut(null, created, new Date('2026-07-06T01:00:01Z'))).toBe(true)
  })
})

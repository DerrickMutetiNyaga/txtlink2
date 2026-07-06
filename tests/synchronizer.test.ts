import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { SmsStatusSynchronizer } from '@/lib/services/sms-status/synchronizer'
import { RetryScheduler } from '@/lib/services/sms-status/retry-scheduler'
import type { ClaimedMessage } from '@/lib/services/sms-status/status-repository'
import type { ProviderLookup } from '@/lib/services/sms-status/types'

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child() {
    return this
  },
}

function makeMessage(overrides: Partial<ClaimedMessage> = {}): ClaimedMessage {
  return {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    status: 'sent',
    providerMessageId: 'uuid-123',
    statusCheckAttempts: 1,
    segments: 2,
    refunded: false,
    sentAt: new Date(),
    createdAt: new Date(),
    toNumbers: ['+254712345678'],
    senderName: 'TEST',
    ...overrides,
  }
}

function makeFakes() {
  const repository = {
    claimDueMessages: vi.fn<(...args: any[]) => Promise<ClaimedMessage[]>>(async () => []),
    markFinal: vi.fn<(...args: any[]) => Promise<void>>(async () => {}),
    reschedule: vi.fn<(...args: any[]) => Promise<void>>(async () => {}),
    release: vi.fn<(...args: any[]) => Promise<void>>(async () => {}),
    refundIfNeeded: vi.fn<(...args: any[]) => Promise<boolean>>(async () => true),
    findByProviderMessageId: vi.fn<(...args: any[]) => Promise<any>>(async () => null),
    countDue: vi.fn<(...args: any[]) => Promise<number>>(async () => 0),
  }
  const client = {
    getMessageStatus: vi.fn<(...args: any[]) => Promise<ProviderLookup>>(),
    getCircuitState: () => 'closed' as const,
  }
  const scheduler = new RetryScheduler({
    retryIntervalsSeconds: [30, 120, 300],
    providerFinalTimeoutHours: 72,
  })
  const synchronizer = new SmsStatusSynchronizer({
    client: client as any,
    repository: repository as any,
    scheduler,
    logger: silentLogger as any,
    workerConcurrency: 4,
  })
  return { repository, client, scheduler, synchronizer }
}

describe('SmsStatusSynchronizer.syncClaimedMessage', () => {
  let fakes: ReturnType<typeof makeFakes>

  beforeEach(() => {
    fakes = makeFakes()
  })

  it('finalizes a delivered message without refunding', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({
      ok: true,
      result: { status: 'delivered', isFinal: true, providerStatusRaw: 'DELIVERED' },
    })

    const outcome = await fakes.synchronizer.syncClaimedMessage(makeMessage())

    expect(outcome).toBe('finalized')
    expect(fakes.repository.markFinal).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered' })
    )
    expect(fakes.repository.refundIfNeeded).not.toHaveBeenCalled()
  })

  it('finalizes a failed message and refunds credits once', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({
      ok: true,
      result: {
        status: 'failed',
        isFinal: true,
        providerStatusRaw: 'FAILED',
        cause: 'Absent subscriber',
      },
    })

    const message = makeMessage({ segments: 3 })
    const outcome = await fakes.synchronizer.syncClaimedMessage(message)

    expect(outcome).toBe('finalized')
    expect(fakes.repository.refundIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ credits: 3 })
    )
  })

  it('does not refund when the failure cause is a blacklisted sender ID', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({
      ok: true,
      result: {
        status: 'failed',
        isFinal: true,
        providerStatusRaw: 'FAILED',
        cause: 'User has blacklisted sender ID',
      },
    })

    await fakes.synchronizer.syncClaimedMessage(makeMessage())
    expect(fakes.repository.refundIfNeeded).not.toHaveBeenCalled()
  })

  it('does not refund an already-refunded message', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({
      ok: true,
      result: { status: 'failed', isFinal: true, providerStatusRaw: 'FAILED' },
    })

    await fakes.synchronizer.syncClaimedMessage(makeMessage({ refunded: true }))
    expect(fakes.repository.refundIfNeeded).not.toHaveBeenCalled()
  })

  it('reschedules a still-pending message with the backoff schedule', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({
      ok: true,
      result: { status: 'sent', isFinal: false, providerStatusRaw: 'SUBMITTED' },
    })

    const message = makeMessage({ statusCheckAttempts: 1 })
    const before = Date.now()
    const outcome = await fakes.synchronizer.syncClaimedMessage(message)

    expect(outcome).toBe('rescheduled')
    const call = fakes.repository.reschedule.mock.calls[0][0] as any
    // attempts=1 -> second interval (120s)
    expect(call.nextCheckAt.getTime()).toBeGreaterThanOrEqual(before + 120_000 - 50)
    expect(fakes.repository.markFinal).not.toHaveBeenCalled()
  })

  it('reschedules as retrying when the provider has no report yet', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({ ok: true, result: null })

    const outcome = await fakes.synchronizer.syncClaimedMessage(makeMessage())
    expect(outcome).toBe('rescheduled')
    expect(fakes.repository.reschedule).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'retrying' })
    )
  })

  it('releases the lease on provider timeout instead of crashing', async () => {
    fakes.client.getMessageStatus.mockResolvedValue({
      ok: false,
      error: { kind: 'timeout', message: 'Request timed out' },
    })

    const outcome = await fakes.synchronizer.syncClaimedMessage(makeMessage())
    expect(outcome).toBe('errors')
    expect(fakes.repository.release).toHaveBeenCalled()
    expect(fakes.repository.markFinal).not.toHaveBeenCalled()
  })

  it('marks provider_timeout for messages pending beyond the configured window', async () => {
    const old = new Date(Date.now() - 100 * 60 * 60 * 1000) // 100h ago > 72h
    const outcome = await fakes.synchronizer.syncClaimedMessage(
      makeMessage({ sentAt: old, createdAt: old })
    )

    expect(outcome).toBe('timedOut')
    expect(fakes.repository.markFinal).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'provider_timeout' })
    )
    // Unknown outcome -> no automatic refund
    expect(fakes.repository.refundIfNeeded).not.toHaveBeenCalled()
    expect(fakes.client.getMessageStatus).not.toHaveBeenCalled()
  })

  it('reschedules messages that have no provider message ID yet', async () => {
    const outcome = await fakes.synchronizer.syncClaimedMessage(
      makeMessage({ providerMessageId: null })
    )
    expect(outcome).toBe('rescheduled')
    expect(fakes.client.getMessageStatus).not.toHaveBeenCalled()
  })
})

describe('SmsStatusSynchronizer.syncBatch', () => {
  it('one failing message does not stop the batch', async () => {
    const fakes = makeFakes()
    const messages = [makeMessage(), makeMessage(), makeMessage()]
    fakes.repository.claimDueMessages.mockResolvedValue(messages)

    fakes.client.getMessageStatus
      .mockResolvedValueOnce({
        ok: true,
        result: { status: 'delivered', isFinal: true, providerStatusRaw: 'DELIVERED' },
      })
      .mockRejectedValueOnce(new Error('unexpected explosion'))
      .mockResolvedValueOnce({
        ok: true,
        result: { status: 'delivered', isFinal: true, providerStatusRaw: 'DELIVERED' },
      })

    const summary = await fakes.synchronizer.syncBatch({
      workerId: 'w1',
      batchSize: 10,
      leaseSeconds: 120,
    })

    expect(summary.claimed).toBe(3)
    expect(summary.finalized).toBe(2)
    expect(summary.errors).toBe(1)
    // The exploded message must be released so it gets retried later
    expect(fakes.repository.release).toHaveBeenCalled()
  })

  it('returns an empty summary when nothing is due', async () => {
    const fakes = makeFakes()
    const summary = await fakes.synchronizer.syncBatch({
      workerId: 'w1',
      batchSize: 10,
      leaseSeconds: 120,
    })
    expect(summary).toEqual({ claimed: 0, finalized: 0, rescheduled: 0, timedOut: 0, errors: 0 })
  })
})

describe('SmsStatusSynchronizer.applyProviderStatus (webhook / admin path)', () => {
  it('applies a provider status found by provider message ID', async () => {
    const fakes = makeFakes()
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      status: 'sent',
      statusCheckAttempts: 0,
      segments: 1,
      refunded: false,
      sentAt: new Date(),
      createdAt: new Date(),
      toNumbers: ['+254700000000'],
      senderName: 'TEST',
    }
    fakes.repository.findByProviderMessageId.mockResolvedValue(doc)

    const result = await fakes.synchronizer.applyProviderStatus('uuid-9', 'DELIVERED')

    expect(result.applied).toBe(true)
    expect(result.status).toBe('delivered')
    expect(fakes.repository.markFinal).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered' })
    )
  })

  it('reports not-applied for unknown provider message IDs', async () => {
    const fakes = makeFakes()
    fakes.repository.findByProviderMessageId.mockResolvedValue(null)

    const result = await fakes.synchronizer.applyProviderStatus('missing', 'DELIVERED')
    expect(result.applied).toBe(false)
  })

  it('ignores a late pending report for an already-final message', async () => {
    const fakes = makeFakes()
    fakes.repository.findByProviderMessageId.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      status: 'delivered', // already final
      statusCheckAttempts: 3,
      segments: 1,
      refunded: false,
      sentAt: new Date(),
      createdAt: new Date(),
      toNumbers: ['+254700000000'],
      senderName: 'TEST',
    })

    // Delayed SUBMITTED DLR arriving after DELIVERED must not resurrect the message
    const result = await fakes.synchronizer.applyProviderStatus('uuid-10', 'SUBMITTED')
    expect(result.applied).toBe(false)
    expect(result.status).toBe('delivered')
    expect(fakes.repository.reschedule).not.toHaveBeenCalled()
    expect(fakes.repository.markFinal).not.toHaveBeenCalled()
  })

  it('still applies a late final report to a provider_timeout message', async () => {
    const fakes = makeFakes()
    fakes.repository.findByProviderMessageId.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      status: 'provider_timeout', // worker gave up, but the provider knows better
      statusCheckAttempts: 12,
      segments: 1,
      refunded: false,
      sentAt: new Date(),
      createdAt: new Date(),
      toNumbers: ['+254700000000'],
      senderName: 'TEST',
    })

    const result = await fakes.synchronizer.applyProviderStatus('uuid-11', 'DELIVERED')
    expect(result.applied).toBe(true)
    expect(result.status).toBe('delivered')
    expect(fakes.repository.markFinal).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered' })
    )
  })
})

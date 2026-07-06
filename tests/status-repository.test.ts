/**
 * StatusRepository claim-logic tests.
 *
 * The MongoDB model layer is mocked with an in-memory document store whose
 * findOneAndUpdate is atomic (like MongoDB's) - this validates the lease
 * contract: no message can be claimed by two workers, expired leases are
 * reclaimable, and non-due/final messages are never claimed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'

interface FakeDoc {
  _id: mongoose.Types.ObjectId
  status: string
  nextCheckAt: Date | null
  statusCheckLockedUntil: Date | null
  statusCheckWorkerId: string | null
  statusCheckAttempts: number
  userId: mongoose.Types.ObjectId
  segments: number
  refunded: boolean
  sentAt: Date | null
  createdAt: Date
  toNumbers: string[]
  senderName: string
  externalMsgId?: string
  hpTransactionId?: string
}

const store: FakeDoc[] = []

function matches(doc: FakeDoc, query: any): boolean {
  if (query.status?.$in && !query.status.$in.includes(doc.status)) return false
  if (query.nextCheckAt?.$lte) {
    if (!doc.nextCheckAt || doc.nextCheckAt > query.nextCheckAt.$lte) return false
  }
  if (query.$or) {
    const ok = query.$or.some((clause: any) => {
      if ('statusCheckLockedUntil' in clause) {
        const cond = clause.statusCheckLockedUntil
        if (cond === null) return doc.statusCheckLockedUntil === null
        if (cond?.$lte) return doc.statusCheckLockedUntil !== null && doc.statusCheckLockedUntil <= cond.$lte
      }
      return false
    })
    if (!ok) return false
  }
  return true
}

vi.mock('@/lib/db/models', () => {
  const SMS_PENDING_STATUSES = ['queued', 'sent', 'processing', 'retrying']
  const SMS_FINAL_STATUSES = ['delivered', 'failed', 'expired', 'rejected', 'undeliverable', 'provider_timeout']
  return {
    SMS_PENDING_STATUSES,
    SMS_FINAL_STATUSES,
    User: { updateOne: vi.fn(async () => ({})) },
    SmsMessage: {
      // Atomic claim: find first matching (sorted) doc, apply update, return it.
      findOneAndUpdate: (query: any, update: any) => ({
        lean: async () => {
          const candidates = store
            .filter((doc) => matches(doc, query))
            .sort((a, b) => {
              const at = a.nextCheckAt?.getTime() ?? 0
              const bt = b.nextCheckAt?.getTime() ?? 0
              if (at !== bt) return at - bt
              return a._id.toString().localeCompare(b._id.toString())
            })
          const doc = candidates[0]
          if (!doc) return null
          if (update.$set) Object.assign(doc, update.$set)
          if (update.$inc) {
            for (const [key, amount] of Object.entries(update.$inc)) {
              ;(doc as any)[key] = ((doc as any)[key] ?? 0) + (amount as number)
            }
          }
          return { ...doc }
        },
      }),
      updateOne: vi.fn(async () => ({})),
      findOne: () => ({ lean: async () => null }),
      countDocuments: async () => 0,
    },
  }
})

import { StatusRepository } from '@/lib/services/sms-status/status-repository'

function seed(overrides: Partial<FakeDoc> = {}): FakeDoc {
  const doc: FakeDoc = {
    _id: new mongoose.Types.ObjectId(),
    status: 'sent',
    nextCheckAt: new Date(Date.now() - 1000),
    statusCheckLockedUntil: null,
    statusCheckWorkerId: null,
    statusCheckAttempts: 0,
    userId: new mongoose.Types.ObjectId(),
    segments: 1,
    refunded: false,
    sentAt: new Date(),
    createdAt: new Date(),
    toNumbers: ['+254712345678'],
    senderName: 'TEST',
    externalMsgId: 'uuid-x',
    ...overrides,
  }
  store.push(doc)
  return doc
}

describe('StatusRepository.claimDueMessages', () => {
  const repository = new StatusRepository()

  beforeEach(() => {
    store.length = 0
  })

  it('claims due pending messages and sets the lease atomically', async () => {
    seed()
    seed()

    const claimed = await repository.claimDueMessages({
      workerId: 'worker-A',
      batchSize: 10,
      leaseSeconds: 120,
    })

    expect(claimed).toHaveLength(2)
    for (const doc of store) {
      expect(doc.statusCheckWorkerId).toBe('worker-A')
      expect(doc.statusCheckLockedUntil).not.toBeNull()
      expect(doc.statusCheckAttempts).toBe(1)
    }
  })

  it('two workers never claim the same message', async () => {
    for (let i = 0; i < 6; i++) seed()

    const [claimedA, claimedB] = await Promise.all([
      repository.claimDueMessages({ workerId: 'worker-A', batchSize: 10, leaseSeconds: 120 }),
      repository.claimDueMessages({ workerId: 'worker-B', batchSize: 10, leaseSeconds: 120 }),
    ])

    const idsA = claimedA.map((m) => m._id.toString())
    const idsB = claimedB.map((m) => m._id.toString())
    const overlap = idsA.filter((id) => idsB.includes(id))

    expect(overlap).toHaveLength(0)
    expect(idsA.length + idsB.length).toBe(6)
  })

  it('skips messages locked by a live worker', async () => {
    seed({
      statusCheckLockedUntil: new Date(Date.now() + 60_000),
      statusCheckWorkerId: 'worker-other',
    })

    const claimed = await repository.claimDueMessages({
      workerId: 'worker-A',
      batchSize: 10,
      leaseSeconds: 120,
    })
    expect(claimed).toHaveLength(0)
  })

  it('reclaims messages whose lease has expired (crashed worker)', async () => {
    seed({
      statusCheckLockedUntil: new Date(Date.now() - 1000),
      statusCheckWorkerId: 'worker-dead',
    })

    const claimed = await repository.claimDueMessages({
      workerId: 'worker-A',
      batchSize: 10,
      leaseSeconds: 120,
    })
    expect(claimed).toHaveLength(1)
    expect(store[0].statusCheckWorkerId).toBe('worker-A')
  })

  it('never claims final or not-yet-due messages', async () => {
    seed({ status: 'delivered', nextCheckAt: null })
    seed({ status: 'failed', nextCheckAt: null })
    seed({ nextCheckAt: new Date(Date.now() + 60_000) }) // due in the future

    const claimed = await repository.claimDueMessages({
      workerId: 'worker-A',
      batchSize: 10,
      leaseSeconds: 120,
    })
    expect(claimed).toHaveLength(0)
  })

  it('respects batchSize', async () => {
    for (let i = 0; i < 5; i++) seed()
    const claimed = await repository.claimDueMessages({
      workerId: 'worker-A',
      batchSize: 3,
      leaseSeconds: 120,
    })
    expect(claimed).toHaveLength(3)
  })

  it('claims oldest nextCheckAt first', async () => {
    const newer = seed({ nextCheckAt: new Date(Date.now() - 1000) })
    const older = seed({ nextCheckAt: new Date(Date.now() - 60_000) })

    const claimed = await repository.claimDueMessages({
      workerId: 'worker-A',
      batchSize: 1,
      leaseSeconds: 120,
    })
    expect(claimed[0]._id.toString()).toBe(older._id.toString())
    expect(claimed[0]._id.toString()).not.toBe(newer._id.toString())
  })
})

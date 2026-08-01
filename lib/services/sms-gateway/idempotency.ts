/**
 * Optional idempotency for Android gateway status events.
 * Legacy clients without eventId/idempotencyKey continue to work.
 */

import crypto from 'crypto'
import mongoose from 'mongoose'
import { SmsGatewayStatusEvent } from '@/lib/db/models'

export type GatewayStatusEventInput = {
  userId: mongoose.Types.ObjectId | string
  jobId: string
  eventId?: string | null
  idempotencyKey?: string | null
  attemptId?: string | null
  eventType?: string | null
  eventTimestamp?: string | Date | null
  partIndex?: number | null
  totalParts?: number | null
  payloadSummary?: Record<string, unknown>
}

export type IdempotencyResult =
  | { duplicate: false; key: string | null }
  | {
      duplicate: true
      key: string
      previousResponse: Record<string, unknown>
    }

function buildKey(input: GatewayStatusEventInput): string | null {
  if (input.eventId && String(input.eventId).trim()) {
    return `eid:${String(input.eventId).trim()}`
  }
  if (input.idempotencyKey && String(input.idempotencyKey).trim()) {
    return `ikey:${String(input.idempotencyKey).trim()}`
  }
  return null
}

export async function beginGatewayStatusEvent(
  input: GatewayStatusEventInput
): Promise<IdempotencyResult> {
  const key = buildKey(input)
  if (!key) return { duplicate: false, key: null }

  const userId =
    typeof input.userId === 'string'
      ? new mongoose.Types.ObjectId(input.userId)
      : input.userId

  const existing = await SmsGatewayStatusEvent.findOne({ userId, key }).lean()
  if (existing) {
    return {
      duplicate: true,
      key,
      previousResponse: (existing.response as Record<string, unknown>) || {
        success: true,
        duplicate: true,
      },
    }
  }

  try {
    await SmsGatewayStatusEvent.create({
      userId,
      jobId: input.jobId,
      key,
      eventId: input.eventId || undefined,
      idempotencyKey: input.idempotencyKey || undefined,
      attemptId: input.attemptId || undefined,
      eventType: input.eventType || undefined,
      eventTimestamp: input.eventTimestamp ? new Date(input.eventTimestamp) : undefined,
      partIndex: input.partIndex ?? undefined,
      totalParts: input.totalParts ?? undefined,
      payloadSummary: input.payloadSummary || undefined,
      status: 'processing',
    })
    return { duplicate: false, key }
  } catch (err: any) {
    // Unique index race — treat as duplicate
    if (err?.code === 11000) {
      const again = await SmsGatewayStatusEvent.findOne({ userId, key }).lean()
      return {
        duplicate: true,
        key,
        previousResponse: (again?.response as Record<string, unknown>) || {
          success: true,
          duplicate: true,
        },
      }
    }
    throw err
  }
}

export async function completeGatewayStatusEvent(
  userId: mongoose.Types.ObjectId | string,
  key: string | null,
  response: Record<string, unknown>
): Promise<void> {
  if (!key) return
  const uid =
    typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
  await SmsGatewayStatusEvent.findOneAndUpdate(
    { userId: uid, key },
    {
      $set: {
        status: 'completed',
        response,
        completedAt: new Date(),
      },
    }
  )
}

/** Hash helper for audit-safe event fingerprints (never store raw tokens). */
export function hashStatusEventFingerprint(parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

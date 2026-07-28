/**
 * SMS History live stream helpers (SSE over MongoDB change streams).
 */

import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import type { AuthUser } from '@/lib/auth/middleware'
import type { FormattedSmsHistoryRow } from './format'

/** Fields that matter to the SMS History UI — ignore worker lease/heartbeat noise. */
export const SMS_HISTORY_LIVE_FIELDS = [
  'status',
  'fallbackStatus',
  'deliveryMethod',
  'deliveredAt',
  'failedAt',
  'sentAt',
  'errorMessage',
  'errorCode',
  'deliveryCause',
  'providerStatus',
  'providerError',
  'requiresPhoneTopUp',
  'fallbackFailureReason',
  'fallbackJobId',
  'fallbackProvider',
  'providerRetryAttempted',
  'providerRetryStatus',
  'hpTransactionId',
  'externalMsgId',
  'message',
  'messageBody',
  'messageRedacted',
  'totalCost',
  'toNumbers',
  'senderName',
  'campaignName',
  'source',
  'apiKeyName',
] as const

export type SmsHistoryLiveEvent =
  | {
      type: 'sms.upsert'
      op: 'insert' | 'update'
      message: FormattedSmsHistoryRow
      at: string
    }
  | {
      type: 'heartbeat'
      at: string
    }
  | {
      type: 'connected'
      at: string
    }
  | {
      type: 'error'
      message: string
      at: string
    }

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables')
  }
  return secret
}

/**
 * Auth for SSE: Authorization header, cookie, or ?token= (EventSource cannot set headers).
 */
export function verifyAuthForLiveStream(request: NextRequest): AuthUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.replace(/^Bearer\s+/i, '').trim()
    const queryToken = request.nextUrl.searchParams.get('token')?.trim()
    const cookieToken = request.cookies.get('token')?.value
    const token = headerToken || queryToken || cookieToken
    if (!token) return null
    return jwt.verify(token, getJwtSecret()) as AuthUser
  } catch {
    return null
  }
}

export function isMeaningfulSmsHistoryUpdate(
  updatedFields?: Record<string, unknown> | null,
  removedFields?: string[] | null
): boolean {
  if (!updatedFields && (!removedFields || removedFields.length === 0)) {
    // No updateDescription (e.g. replace) — treat as meaningful
    return true
  }

  const keys = new Set([
    ...Object.keys(updatedFields || {}),
    ...(removedFields || []),
  ])

  return SMS_HISTORY_LIVE_FIELDS.some((field) => {
    if (keys.has(field)) return true
    // Nested paths like "fallbackStatus" won't have dots here; check prefix for safety
    for (const key of keys) {
      if (key === field || key.startsWith(`${field}.`)) return true
    }
    return false
  })
}

export function encodeSseEvent(event: SmsHistoryLiveEvent, eventId?: string): string {
  const lines: string[] = []
  if (eventId) lines.push(`id: ${eventId}`)
  lines.push(`event: ${event.type}`)
  lines.push(`data: ${JSON.stringify(event)}`)
  lines.push('', '') // blank line terminates the event
  return lines.join('\n')
}

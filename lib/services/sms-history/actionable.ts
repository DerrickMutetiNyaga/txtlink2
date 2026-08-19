import mongoose from 'mongoose'
import { SMS_PENDING_STATUSES } from '@/lib/db/models'
import {
  ACTIVE_FALLBACK_STATUSES,
  FAILED_LIKE_STATUSES,
} from '@/lib/services/sms-history/constants'

export const PHONE_ATTENTION_STATUSES = ['phone_failed', 'phone_requires_topup'] as const

/** Phone already handed the SMS off — these must not appear on Pending & Failed. */
export const RESOLVED_PHONE_FALLBACK_STATUSES = ['delivered_via_phone', 'sent_via_phone'] as const

/** Fallback states that still need attention / can be manually completed */
export const ACTIONABLE_FALLBACK_STATUSES = [
  ...ACTIVE_FALLBACK_STATUSES,
  ...PHONE_ATTENTION_STATUSES,
  'cancelled',
] as const

export type ActionableView = 'all' | 'pending' | 'failed'

export function normalizeActionableView(value: unknown): ActionableView {
  const view = String(value || 'all').toLowerCase()
  if (view === 'pending' || view === 'failed') return view
  return 'all'
}

export const MANUAL_COMPLETED_CAUSE = 'manually_completed_by_user'

export function isManuallyCompleted(doc: { deliveryCause?: string | null }): boolean {
  return doc.deliveryCause === MANUAL_COMPLETED_CAUSE
}

function notResolvedYet() {
  return {
    status: { $ne: 'delivered' },
    deliveryCause: { $ne: MANUAL_COMPLETED_CAUSE },
    fallbackStatus: { $nin: [...RESOLVED_PHONE_FALLBACK_STATUSES] },
  }
}

/**
 * Pending / failed SMS eligible for manual retry.
 * Phone-sent and phone-delivered messages are excluded so they cannot sit
 * on this desk after the Android gateway has already sent them.
 */
export function buildActionableSmsFilter(
  userId: mongoose.Types.ObjectId,
  view: ActionableView = 'all'
): Record<string, unknown> {
  const resolved = notResolvedYet()

  if (view === 'pending') {
    return {
      userId,
      ...resolved,
      $or: [
        { status: { $in: [...SMS_PENDING_STATUSES] } },
        { fallbackStatus: { $in: [...ACTIVE_FALLBACK_STATUSES] } },
        { fallbackQueued: true },
      ],
    }
  }

  if (view === 'failed') {
    return {
      userId,
      ...resolved,
      $or: [
        { status: { $in: [...FAILED_LIKE_STATUSES] } },
        { fallbackStatus: { $in: [...PHONE_ATTENTION_STATUSES] } },
        { deliveryMethod: 'android_phone_gateway_failed' },
      ],
    }
  }

  return {
    userId,
    ...resolved,
    $or: [
      { status: { $in: [...SMS_PENDING_STATUSES] } },
      { status: { $in: [...FAILED_LIKE_STATUSES] } },
      { fallbackStatus: { $in: [...ACTIONABLE_FALLBACK_STATUSES] } },
      { fallbackQueued: true },
      { deliveryMethod: 'android_phone_gateway_failed' },
    ],
  }
}

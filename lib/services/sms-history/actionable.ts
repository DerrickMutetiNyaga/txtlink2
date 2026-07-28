import mongoose from 'mongoose'
import { SMS_PENDING_STATUSES } from '@/lib/db/models'
import {
  ACTIVE_FALLBACK_STATUSES,
  FAILED_LIKE_STATUSES,
} from '@/lib/services/sms-history/constants'

export const PHONE_ATTENTION_STATUSES = ['phone_failed', 'phone_requires_topup'] as const

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

/** Same match criteria as GET /api/user/sms/history/actionable — covers every undelivered / fallback-stuck SMS */
export function buildActionableSmsFilter(
  userId: mongoose.Types.ObjectId,
  view: ActionableView = 'all'
): Record<string, unknown> {
  if (view === 'pending') {
    return {
      userId,
      deliveryMethod: { $ne: 'android_phone_gateway' },
      status: { $in: [...SMS_PENDING_STATUSES] },
    }
  }

  if (view === 'failed') {
    return {
      userId,
      deliveryMethod: { $ne: 'android_phone_gateway' },
      status: { $ne: 'delivered' },
      $or: [
        { status: { $in: [...FAILED_LIKE_STATUSES] } },
        { fallbackStatus: { $in: [...PHONE_ATTENTION_STATUSES] } },
      ],
    }
  }

  return {
    userId,
    deliveryMethod: { $ne: 'android_phone_gateway' },
    status: { $ne: 'delivered' },
    $or: [
      { status: { $in: [...SMS_PENDING_STATUSES] } },
      { status: { $in: [...FAILED_LIKE_STATUSES] } },
      { fallbackStatus: { $in: [...ACTIONABLE_FALLBACK_STATUSES] } },
      { fallbackQueued: true },
    ],
  }
}

export const MANUAL_COMPLETED_CAUSE = 'manually_completed_by_user'

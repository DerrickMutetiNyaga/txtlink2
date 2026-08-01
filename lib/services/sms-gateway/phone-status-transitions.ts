/**
 * Monotonic phone-gateway status transitions for SmsMessage / SmsFallbackJob.
 * Stale or duplicate events must never move a message backward.
 */

export type PhoneSmsStatus =
  | 'queued_for_phone'
  | 'sending_via_phone'
  | 'sent_via_phone'
  | 'delivered_via_phone'
  | 'phone_failed'
  | 'phone_requires_topup'
  | 'cancelled'
  | 'submission_unknown'

export type PhoneJobStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'blocked'
  | 'cancelled'
  | 'awaiting_delivery'

const SMS_RANK: Record<string, number> = {
  queued_for_phone: 10,
  sending_via_phone: 20,
  submission_unknown: 25,
  sent_via_phone: 30,
  phone_requires_topup: 35,
  phone_failed: 35,
  cancelled: 40,
  delivered_via_phone: 50,
}

const JOB_RANK: Record<string, number> = {
  pending: 10,
  sending: 20,
  awaiting_delivery: 25,
  sent: 30,
  blocked: 35,
  failed: 35,
  cancelled: 40,
  delivered: 50,
}

export type TransitionDecision =
  | { ok: true; apply: boolean; reason: 'advanced' | 'same' }
  | { ok: false; apply: false; reason: 'regression' | 'terminal_block' | 'unknown_target' }

function rankOf(map: Record<string, number>, status?: string | null): number {
  if (!status) return 0
  return map[status] ?? 0
}

export function canTransitionPhoneSmsStatus(
  current?: string | null,
  next?: string | null
): TransitionDecision {
  if (!next) return { ok: false, apply: false, reason: 'unknown_target' }
  if (!(next in SMS_RANK)) return { ok: false, apply: false, reason: 'unknown_target' }

  const cur = current || ''
  if (cur === next) return { ok: true, apply: false, reason: 'same' }

  // Delivered is terminal for phone success path
  if (cur === 'delivered_via_phone') {
    return { ok: false, apply: false, reason: 'terminal_block' }
  }

  // Failed/top-up may advance to queued (manual retry) or delivered (late DLR)
  if (
    (cur === 'phone_failed' || cur === 'phone_requires_topup') &&
    (next === 'queued_for_phone' ||
      next === 'sending_via_phone' ||
      next === 'sent_via_phone' ||
      next === 'delivered_via_phone')
  ) {
    return { ok: true, apply: true, reason: 'advanced' }
  }

  const from = rankOf(SMS_RANK, cur)
  const to = rankOf(SMS_RANK, next)
  if (to < from) return { ok: false, apply: false, reason: 'regression' }
  return { ok: true, apply: true, reason: 'advanced' }
}

export function canTransitionPhoneJobStatus(
  current?: string | null,
  next?: string | null
): TransitionDecision {
  if (!next) return { ok: false, apply: false, reason: 'unknown_target' }
  if (!(next in JOB_RANK) && next !== 'awaiting_delivery') {
    // awaiting_delivery maps to phoneStatus conceptually; job.status may stay 'sent'
  }

  const cur = current || ''
  if (cur === next) return { ok: true, apply: false, reason: 'same' }

  if (cur === 'delivered') {
    return { ok: false, apply: false, reason: 'terminal_block' }
  }

  // Manual resume / reclaim may reopen failed/blocked → pending
  if (
    (cur === 'failed' || cur === 'blocked' || cur === 'cancelled') &&
    (next === 'pending' || next === 'sending')
  ) {
    return { ok: true, apply: true, reason: 'advanced' }
  }

  const from = rankOf(JOB_RANK, cur)
  const to = rankOf(JOB_RANK, next)
  if (to < from) return { ok: false, apply: false, reason: 'regression' }
  return { ok: true, apply: true, reason: 'advanced' }
}

/** Map Android gateway event types to SMS fallbackStatus values. */
export function mapAndroidEventToSmsFallbackStatus(event: {
  eventType?: string | null
  delivered?: boolean
  sent?: boolean
  requiresTopUp?: boolean
  ambiguous?: boolean
  failed?: boolean
}): PhoneSmsStatus {
  if (event.requiresTopUp) return 'phone_requires_topup'
  if (event.delivered || event.eventType === 'delivered') return 'delivered_via_phone'
  if (event.ambiguous || event.eventType === 'ambiguous' || event.eventType === 'unknown') {
    return 'submission_unknown'
  }
  if (event.sent || event.eventType === 'sent' || event.eventType === 'submitted') {
    return 'sent_via_phone'
  }
  if (event.failed || event.eventType === 'failed') return 'phone_failed'
  if (event.eventType === 'awaiting_delivery') return 'sent_via_phone'
  return 'sending_via_phone'
}

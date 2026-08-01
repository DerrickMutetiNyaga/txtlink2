/**
 * Classify Android gateway / phone-fallback failures.
 * Transient connectivity problems must never pause the whole gateway.
 */

export type FailureCategory =
  | 'TRANSIENT_CONNECTIVITY'
  | 'TRANSIENT_SYNC'
  | 'TRANSIENT_SERVER'
  | 'AMBIGUOUS_RESULT'
  | 'TOP_UP_REQUIRED'
  | 'SIM_UNAVAILABLE'
  | 'MODEM_FAILURE'
  | 'RATE_LIMIT'
  | 'PERMANENT'
  | 'UNKNOWN'

export type FailureClassification = {
  category: FailureCategory
  /** Pause only the affected SIM, never the whole gateway for transient errors */
  pauseScope: 'NONE' | 'SIM' | 'GATEWAY'
  /** Safe to auto-retry without creating a new send job */
  retryable: boolean
  /** Count toward modem consecutive failures */
  countsAsModemFailure: boolean
  /** Count toward transient consecutive failures (reset on success) */
  countsAsTransientFailure: boolean
  /** Human-safe label for UI/audit */
  label: string
}

const TRANSIENT_PATTERNS: Array<{ re: RegExp; category: FailureCategory; label: string }> = [
  { re: /heartbeat/i, category: 'TRANSIENT_CONNECTIVITY', label: 'Heartbeat failure' },
  { re: /queue.?fetch|pending.?job|fetch.*pending/i, category: 'TRANSIENT_SYNC', label: 'Queue fetch failure' },
  { re: /status.?sync|status.?update|synchron/i, category: 'TRANSIENT_SYNC', label: 'Status sync failure' },
  { re: /timeout|timed?\s*out|ETIMEDOUT|ESOCKETTIMEDOUT/i, category: 'TRANSIENT_CONNECTIVITY', label: 'HTTP timeout' },
  { re: /dns|ENOTFOUND|EAI_AGAIN/i, category: 'TRANSIENT_CONNECTIVITY', label: 'DNS failure' },
  { re: /network|internet|offline|disconnected|ECONNRESET|ECONNREFUSED|ENETUNREACH/i, category: 'TRANSIENT_CONNECTIVITY', label: 'Network error' },
  { re: /\b502\b|\b503\b|\b504\b|bad gateway|service unavailable|gateway time/i, category: 'TRANSIENT_SERVER', label: 'Server unavailable' },
  { re: /\b500\b|internal server error/i, category: 'TRANSIENT_SERVER', label: 'Server error' },
  { re: /mongo|mongodb|transient transaction/i, category: 'TRANSIENT_SERVER', label: 'Database transient failure' },
  { re: /delivery confirmation|missing delivery|no delivery report|awaiting delivery/i, category: 'AMBIGUOUS_RESULT', label: 'Missing delivery confirmation' },
  { re: /ambiguous|unknown submission|result code\s*0\b|callback.*\b0\b|RESULT_ERROR_GENERIC/i, category: 'AMBIGUOUS_RESULT', label: 'Ambiguous Android callback' },
  { re: /live.?update|event.?stream|sse|browser.*disconnect/i, category: 'TRANSIENT_SYNC', label: 'Live-update disconnection' },
]

const SIM_PAUSE_PATTERNS: Array<{ re: RegExp; category: FailureCategory; label: string }> = [
  { re: /top.?up|airtime|bundle|no credit|insufficient balance|out of credit/i, category: 'TOP_UP_REQUIRED', label: 'Top-up required' },
  { re: /sim (inactive|removed|missing|unavailable)|no sim|radio unavailable|radio off/i, category: 'SIM_UNAVAILABLE', label: 'SIM unavailable' },
  { re: /rate.?limit|too many messages|throttl/i, category: 'RATE_LIMIT', label: 'Carrier rate limit' },
  { re: /modem|radio error|RIL_|telephony|sms permission denied/i, category: 'MODEM_FAILURE', label: 'Modem failure' },
]

export function classifyGatewayFailure(input: {
  failureReason?: string | null
  failureCode?: string | null
  requiresTopUp?: boolean
  resultCode?: number | string | null
  httpStatus?: number | null
}): FailureClassification {
  if (input.requiresTopUp) {
    return {
      category: 'TOP_UP_REQUIRED',
      pauseScope: 'SIM',
      retryable: false,
      countsAsModemFailure: false,
      countsAsTransientFailure: false,
      label: 'Top-up required',
    }
  }

  const resultCode =
    input.resultCode == null || input.resultCode === ''
      ? null
      : Number(input.resultCode)
  if (resultCode === 0) {
    return {
      category: 'AMBIGUOUS_RESULT',
      pauseScope: 'NONE',
      retryable: true,
      countsAsModemFailure: false,
      countsAsTransientFailure: true,
      label: 'Ambiguous Android callback (result code 0)',
    }
  }

  if (input.httpStatus != null && [408, 425, 429, 500, 502, 503, 504].includes(input.httpStatus)) {
    return {
      category: 'TRANSIENT_SERVER',
      pauseScope: 'NONE',
      retryable: true,
      countsAsModemFailure: false,
      countsAsTransientFailure: true,
      label: `Server HTTP ${input.httpStatus}`,
    }
  }

  const text = [input.failureReason, input.failureCode].filter(Boolean).join(' ')

  for (const rule of TRANSIENT_PATTERNS) {
    if (rule.re.test(text)) {
      return {
        category: rule.category,
        pauseScope: 'NONE',
        retryable: true,
        countsAsModemFailure: false,
        countsAsTransientFailure: true,
        label: rule.label,
      }
    }
  }

  for (const rule of SIM_PAUSE_PATTERNS) {
    if (rule.re.test(text)) {
      return {
        category: rule.category,
        pauseScope: 'SIM',
        retryable: rule.category === 'RATE_LIMIT',
        countsAsModemFailure: rule.category === 'MODEM_FAILURE',
        countsAsTransientFailure: false,
        label: rule.label,
      }
    }
  }

  if (!text.trim()) {
    return {
      category: 'AMBIGUOUS_RESULT',
      pauseScope: 'NONE',
      retryable: true,
      countsAsModemFailure: false,
      countsAsTransientFailure: true,
      label: 'Unknown / empty failure',
    }
  }

  return {
    category: 'UNKNOWN',
    pauseScope: 'NONE',
    retryable: true,
    countsAsModemFailure: false,
    countsAsTransientFailure: true,
    label: 'Unclassified failure',
  }
}

/** Reasons previously used to pause the whole gateway that should be repaired. */
export function isAccidentalGatewayPauseReason(reason?: string | null, code?: string | null): boolean {
  const classification = classifyGatewayFailure({
    failureReason: reason,
    failureCode: code,
  })
  return (
    classification.pauseScope === 'NONE' ||
    classification.category === 'TRANSIENT_CONNECTIVITY' ||
    classification.category === 'TRANSIENT_SYNC' ||
    classification.category === 'TRANSIENT_SERVER' ||
    classification.category === 'AMBIGUOUS_RESULT'
  )
}

/**
 * StatusMapper - maps HostPinnacle provider statuses to internal statuses.
 *
 * This is the single place where provider status strings are interpreted.
 * The worker, admin manual sync, and DLR webhook all go through here so a
 * provider vocabulary change only ever needs one edit.
 */

import { SMS_FINAL_STATUSES, type SmsStatus } from '@/lib/db/models'
import type { ProviderStatusResult } from './types'

/**
 * HostPinnacle status vocabulary (from /SMSApi/report/status and DLR pushes):
 *   DELIVERED / DELIVRD  -> delivered (final)
 *   SUBMITTED / SENT     -> sent (pending; accepted by carrier, awaiting DLR)
 *   PENDING / PROCESSING -> processing (pending)
 *   FAILED               -> failed (final)
 *   EXPIRED              -> expired (final)
 *   REJECTED / REJECTD   -> rejected (final)
 *   UNDELIV / UNDELIVERED / UNDELIVERABLE -> undeliverable (final)
 *   SUCCESS / OK         -> sent (NOT delivered — HostPinnacle uses these as
 *                          API envelope / accept acknowledgements, not handset DLR)
 *   anything else        -> processing (pending, keep checking)
 */
const PROVIDER_STATUS_MAP: Record<string, SmsStatus> = {
  DELIVERED: 'delivered',
  DELIVRD: 'delivered',
  DLVRD: 'delivered',
  DLV: 'delivered',
  // HostPinnacle send/status APIs often return status:"success" meaning the
  // HTTP/API call succeeded or the message was accepted — NOT that the handset
  // received it. Treat as pending so we keep polling for real DLR vocabulary.
  SUCCESS: 'sent',
  OK: 'sent',
  SUBMITTED: 'sent',
  SENT: 'sent',
  ACCEPTED: 'sent',
  PENDING: 'processing',
  PROCESSING: 'processing',
  QUEUED: 'processing',
  FAILED: 'failed',
  FAIL: 'failed',
  ERROR: 'failed',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
  REJECTD: 'rejected',
  BLACKLISTED: 'rejected',
  UNDELIV: 'undeliverable',
  UNDELIVERED: 'undeliverable',
  UNDELIVERABLE: 'undeliverable',
}

/** API-level envelopes that are not a delivery report by themselves. */
const API_ENVELOPE_STATUSES = new Set(['SUCCESS', 'OK'])

/** Delivery-failure vocabulary used when prioritizing DLR payload fields. */
const FAILURE_PROVIDER_STATUSES = new Set([
  'FAILED',
  'FAIL',
  'ERROR',
  'EXPIRED',
  'REJECTED',
  'REJECTD',
  'BLACKLISTED',
  'UNDELIV',
  'UNDELIVERED',
  'UNDELIVERABLE',
])

export function isFinalStatus(status: SmsStatus): boolean {
  return (SMS_FINAL_STATUSES as readonly string[]).includes(status)
}

export function isFailureProviderStatus(providerStatusRaw: string): boolean {
  return FAILURE_PROVIDER_STATUSES.has(providerStatusRaw.trim().toUpperCase())
}

export function isApiEnvelopeStatus(providerStatusRaw: string): boolean {
  return API_ENVELOPE_STATUSES.has(providerStatusRaw.trim().toUpperCase())
}

function hasMeaningfulDeliveredTime(deliveredTime: string | number | null | undefined): boolean {
  if (deliveredTime == null) return false
  const raw = String(deliveredTime).trim()
  if (!raw || raw === '0' || raw.toLowerCase() === 'null') return false
  return true
}

/**
 * Resolve HostPinnacle DLR webhook fields into a provider status string.
 *
 * HostPinnacle's webhook params are typically:
 *   Transactionid, Messageid, ErrorCode, mobileNo, ReceivedTime, DeliveredTime
 * — often WITHOUT a Status field. Real delivery is signaled by DeliveredTime
 * with ErrorCode empty/0. Failures use a non-zero ErrorCode (or Status=FAILED).
 *
 * Priority: explicit Status (incl. FAILED) → ErrorCode → DeliveredTime → pending.
 */
export function resolveHostPinnacleDlrStatus(fields: {
  status?: string | null
  errorCode?: string | number | null
  cause?: string | null
  deliveredTime?: string | number | null
}): string {
  const statusStr =
    fields.status != null && String(fields.status).trim() !== ''
      ? String(fields.status).trim()
      : ''
  const errorCode = fields.errorCode
  const hasErrorCode =
    errorCode != null &&
    errorCode !== '' &&
    errorCode !== '0' &&
    errorCode !== 0 &&
    String(errorCode).toLowerCase() !== 'null'
  const causeStr =
    fields.cause != null && String(fields.cause).trim() !== ''
      ? String(fields.cause).trim().toUpperCase()
      : ''

  // 1. Explicit Status from HostPinnacle (FAILED / DELIVERED / SUBMITTED / …)
  if (statusStr) {
    if (isApiEnvelopeStatus(statusStr)) {
      // status:"success" alone is not a handset DLR
      if (hasErrorCode) return 'FAILED'
      if (hasMeaningfulDeliveredTime(fields.deliveredTime)) return 'DELIVERED'
      return 'SUBMITTED'
    }
    // Status=FAILED always wins even if DeliveredTime is also filled
    // (HostPinnacle portal often stamps Delivered Time on failed rows).
    return statusStr
  }

  // 2. Non-zero ErrorCode ⇒ failed (classic HostPinnacle webhook param)
  if (hasErrorCode) return 'FAILED'

  // 3. DeliveredTime with no failure ⇒ delivered.
  // HostPinnacle DLRs usually send DeliveredTime without a Status field.
  if (hasMeaningfulDeliveredTime(fields.deliveredTime)) return 'DELIVERED'

  // 4. Cause text sometimes carries the outcome when Status is omitted
  if (causeStr === 'DELIVERED' || causeStr === 'DELIVRD' || causeStr === 'SUCCESS') {
    return 'DELIVERED'
  }
  if (isFailureProviderStatus(causeStr)) return causeStr

  return 'SUBMITTED'
}


/**
 * Map a raw provider status string to the internal status model.
 * Unknown statuses stay pending (`processing`) so the worker keeps checking.
 */
export function mapProviderStatus(providerStatusRaw: string, cause?: string): ProviderStatusResult {
  const normalized = providerStatusRaw.trim().toUpperCase()
  const status = PROVIDER_STATUS_MAP[normalized] ?? 'processing'
  return {
    status,
    isFinal: isFinalStatus(status),
    providerStatusRaw,
    cause: cause || undefined,
  }
}

/**
 * Parse the HostPinnacle status API response body into a ProviderStatusResult.
 * Returns null when the provider has no report yet for this message
 * (a normal condition shortly after sending - reschedule and retry later).
 *
 * Expected shape (per HostPinnacle docs / prior PHP integration):
 *   { response: { reports_statusList: [ { status: { Status, Cause } } ] } }
 * with several observed fallback shapes handled defensively.
 *
 * Important: a top-level `{ status: "success" }` only means the API call
 * succeeded — it is NOT a delivery report. Those envelopes return null so
 * the worker keeps polling until a real Status (DELIVERED/FAILED/…) appears.
 */
export function parseProviderStatusResponse(data: unknown): ProviderStatusResult | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, any>
  const response = root.response ?? root

  let rawStatus: string | null = null
  let cause = ''
  let fromReportList = false

  const list = response?.reports_statusList
  if (Array.isArray(list) && list.length > 0) {
    const report = list[0]
    if (report?.status) {
      rawStatus = report.status.Status ?? report.status.status ?? null
      cause = report.status.Cause ?? report.status.cause ?? ''
      fromReportList = true
    } else if (typeof report?.Status === 'string') {
      rawStatus = report.Status
      cause = report.Cause ?? report.cause ?? ''
      fromReportList = true
    }
  } else if (Array.isArray(list) && list.length === 0) {
    // Explicit empty report list = no delivery status yet
    return null
  } else if (response?.status && typeof response.status === 'object') {
    rawStatus = response.status.Status ?? response.status.status ?? null
    cause = response.status.Cause ?? response.status.cause ?? ''
  } else if (typeof response?.Status === 'string') {
    rawStatus = response.Status
    cause = response.Cause ?? response.cause ?? ''
  } else if (typeof response?.status === 'string') {
    // Flat delivery status, or an API envelope like status:"success"
    rawStatus = response.status
    cause = response.Cause ?? response.cause ?? ''
  }

  if (!rawStatus || typeof rawStatus !== 'string') return null

  // Bare API envelopes without a real reports_statusList entry are not DLRs.
  if (!fromReportList && isApiEnvelopeStatus(rawStatus)) {
    return null
  }

  return mapProviderStatus(rawStatus, cause)
}

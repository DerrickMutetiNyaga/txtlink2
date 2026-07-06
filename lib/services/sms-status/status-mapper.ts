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
 *   anything else        -> processing (pending, keep checking)
 */
const PROVIDER_STATUS_MAP: Record<string, SmsStatus> = {
  DELIVERED: 'delivered',
  DELIVRD: 'delivered',
  DLVRD: 'delivered',
  DLV: 'delivered',
  SUCCESS: 'delivered',
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

export function isFinalStatus(status: SmsStatus): boolean {
  return (SMS_FINAL_STATUSES as readonly string[]).includes(status)
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
 */
export function parseProviderStatusResponse(data: unknown): ProviderStatusResult | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, any>
  const response = root.response ?? root

  let rawStatus: string | null = null
  let cause = ''

  const list = response?.reports_statusList
  if (Array.isArray(list) && list.length > 0) {
    const report = list[0]
    if (report?.status) {
      rawStatus = report.status.Status ?? report.status.status ?? null
      cause = report.status.Cause ?? report.status.cause ?? ''
    }
  } else {
    rawStatus =
      response?.status?.Status ??
      response?.status?.status ??
      (typeof response?.Status === 'string' ? response.Status : null) ??
      (typeof response?.status === 'string' ? response.status : null)
    cause = response?.status?.Cause ?? response?.status?.cause ?? response?.Cause ?? response?.cause ?? ''
  }

  if (!rawStatus || typeof rawStatus !== 'string') return null
  return mapProviderStatus(rawStatus, cause)
}

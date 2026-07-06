/**
 * Shared types for the SMS delivery-status subsystem.
 * Used by the background worker, admin manual sync, and (future) DLR webhooks.
 */

import type { SmsFinalStatus, SmsPendingStatus, SmsStatus } from '@/lib/db/models'

export type { SmsFinalStatus, SmsPendingStatus, SmsStatus }

/** Normalized outcome of one provider status lookup */
export interface ProviderStatusResult {
  /** Internal status the provider status maps to */
  status: SmsStatus
  /** True when `status` is terminal and the message must not be checked again */
  isFinal: boolean
  /** Raw status string exactly as the provider returned it */
  providerStatusRaw: string
  /** Provider's failure/delivery cause, if any */
  cause?: string
}

/** Transport-level failure from the provider client (no status obtained) */
export interface ProviderLookupError {
  kind: 'timeout' | 'rate_limited' | 'server_error' | 'network' | 'invalid_response' | 'circuit_open'
  message: string
  httpStatus?: number
}

export type ProviderLookup =
  | { ok: true; result: ProviderStatusResult | null } // null = provider has no report yet
  | { ok: false; error: ProviderLookupError }

/** Summary returned by batch synchronization runs (worker cycles, admin sync) */
export interface SyncBatchSummary {
  claimed: number
  finalized: number
  rescheduled: number
  timedOut: number
  errors: number
}

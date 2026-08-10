import { SmsGatewayDevice } from '@/lib/db/models'

/**
 * Safe connection diagnostics for Android HTTPS gateway calls.
 * Never stores raw tokens, Authorization headers, or SMS message bodies.
 */

export interface GatewayConnectionDiagnosticInput {
  deviceId: unknown
  route: string
  httpStatus: number
  durationMs: number
  dbQueryDurationMs?: number
  jobsReturned?: number
  kind?: 'pending' | 'heartbeat' | 'status' | 'ping' | 'other'
  gatewayDeviceIdHeader?: string | null
}

export type GatewayConnectionDiagnosticRecord = {
  gatewayDeviceId: string | null
  timestamp: string
  route: string
  httpResult: number
  durationMs: number
  jobsReturned: number | null
  dbQueryDurationMs: number | null
}

function safeGatewayDeviceId(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Cap length; never treat as a secret token
  return trimmed.slice(0, 128)
}

export function buildSafeDiagnosticLog(
  input: GatewayConnectionDiagnosticInput
): GatewayConnectionDiagnosticRecord {
  return {
    gatewayDeviceId: safeGatewayDeviceId(input.gatewayDeviceIdHeader),
    timestamp: new Date().toISOString(),
    route: input.route,
    httpResult: input.httpStatus,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    jobsReturned:
      typeof input.jobsReturned === 'number' ? Math.max(0, Math.round(input.jobsReturned)) : null,
    dbQueryDurationMs:
      typeof input.dbQueryDurationMs === 'number'
        ? Math.max(0, Math.round(input.dbQueryDurationMs))
        : null,
  }
}

export function logGatewayConnectionDiagnostic(input: GatewayConnectionDiagnosticInput): void {
  const record = buildSafeDiagnosticLog(input)
  console.log('[sms-gateway-diag]', JSON.stringify(record))
}

/**
 * Persist last-contact diagnostics on the gateway device document.
 * Uses updateOne so heartbeat/pending paths stay lightweight.
 */
export async function recordGatewayConnectionDiagnostic(
  input: GatewayConnectionDiagnosticInput
): Promise<void> {
  const now = new Date()
  const record = buildSafeDiagnosticLog(input)
  logGatewayConnectionDiagnostic(input)

  if (!input.deviceId) return

  const $set: Record<string, unknown> = {
    lastSeenAt: now,
    lastHttpAt: now,
    lastHttpRoute: input.route,
    lastHttpStatus: input.httpStatus,
    lastHttpDurationMs: record.durationMs,
  }

  if (typeof input.dbQueryDurationMs === 'number') {
    $set.lastDbQueryDurationMs = record.dbQueryDurationMs
  }

  if (input.kind === 'pending') {
    $set.lastPendingRequestAt = now
    if (input.httpStatus >= 200 && input.httpStatus < 300) {
      $set.lastPendingSuccessAt = now
      if (typeof input.jobsReturned === 'number') {
        $set.lastPendingJobsReturned = record.jobsReturned
      }
    }
  }

  if (input.kind === 'heartbeat') {
    $set.lastHeartbeatAt = now
  }

  if (input.kind === 'status' && input.httpStatus >= 200 && input.httpStatus < 300) {
    $set.lastStatusUpdateAt = now
  }

  await SmsGatewayDevice.updateOne({ _id: input.deviceId }, { $set })
}

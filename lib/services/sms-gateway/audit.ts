/**
 * Safe gateway audit logging — never stores tokens, full SMS bodies, or full phones.
 */

import { logAuditAction } from '@/lib/utils/audit'
import { maskPhone } from '@/lib/utils/log-sanitize'

export type GatewayAuditAction =
  | 'GATEWAY_SETUP_GENERATED'
  | 'GATEWAY_TOKEN_GENERATED'
  | 'GATEWAY_TOKEN_REVOKED'
  | 'GATEWAY_CONFIG_UPDATED'
  | 'GATEWAY_LEGACY_PAUSE_REPAIRED'
  | 'GATEWAY_ONLINE'
  | 'GATEWAY_OFFLINE'
  | 'GATEWAY_SIM_PAUSED'
  | 'GATEWAY_SIM_RESUMED'
  | 'GATEWAY_TRANSIENT_ERROR'
  | 'GATEWAY_STATUS_ACCEPTED'
  | 'GATEWAY_STATUS_DUPLICATE'
  | 'GATEWAY_STATUS_REJECTED'
  | 'GATEWAY_JOB_ASSIGNED'
  | 'GATEWAY_JOB_SENT'
  | 'GATEWAY_JOB_DELIVERED'
  | 'GATEWAY_DELIVERY_UNCONFIRMED'
  | 'GATEWAY_ACCIDENTAL_PAUSE_CLEARED'
  | 'GATEWAY_TRANSIENT_PAUSE_CLEARED'

function sanitizeDetails(details: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(details)) {
    const lower = key.toLowerCase()
    if (
      lower.includes('token') ||
      lower.includes('authorization') ||
      lower.includes('secret') ||
      lower === 'message' ||
      lower === 'body'
    ) {
      continue
    }
    if (lower.includes('phone') && typeof value === 'string') {
      out[key] = maskPhone(value)
      continue
    }
    out[key] = value
  }
  return out
}

export async function logGatewayAudit(
  userId: string,
  action: GatewayAuditAction,
  entityId?: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await logAuditAction(userId, action, 'SmsGatewayDevice', entityId, sanitizeDetails(details))
}

/**
 * Separate gateway service, per-SIM, and synchronization states.
 */

export const GATEWAY_SERVICE_STATES = [
  'ONLINE',
  'OFFLINE',
  'RUNNING',
  'WAITING_FOR_NETWORK',
  'SYNCHRONIZING',
  'STOPPED_BY_USER',
  'START_FAILED',
] as const

export type GatewayServiceState = (typeof GATEWAY_SERVICE_STATES)[number]

export const SIM_PROCESSING_STATES = [
  'ACTIVE',
  'PAUSED_TOP_UP',
  'PAUSED_RATE_LIMIT',
  'PAUSED_MODEM_FAILURE',
  'SIM_UNAVAILABLE',
  'INACTIVE',
] as const

export type SimProcessingState = (typeof SIM_PROCESSING_STATES)[number]

export const SYNC_HEALTH_STATES = [
  'UP_TO_DATE',
  'PENDING',
  'RETRYING',
  'REJECTED',
  'UNKNOWN',
] as const

export type SyncHealthState = (typeof SYNC_HEALTH_STATES)[number]

export type PauseScope = 'GATEWAY' | 'SIM' | null

export function getGatewayOnlineThresholdMs(): number {
  const seconds = parseInt(process.env.GATEWAY_ONLINE_THRESHOLD_SECONDS || '180', 10)
  const valid = Number.isFinite(seconds) && seconds > 0 ? seconds : 180
  return valid * 1000
}

export function getGatewayLatestActivity(device: {
  lastHeartbeatAt?: Date | string | null
  lastSyncAt?: Date | string | null
}): Date | null {
  const dates = [device.lastHeartbeatAt, device.lastSyncAt].filter(Boolean)
  if (!dates.length) return null
  return new Date(Math.max(...dates.map((d) => new Date(d as Date).getTime())))
}

export function deriveGatewayServiceState(device: {
  isActive?: boolean
  boundDeviceFingerprint?: string | null
  isGatewayRunning?: boolean | null
  lastHeartbeatAt?: Date | string | null
  lastSyncAt?: Date | string | null
  pausedAt?: Date | string | null
  pauseScope?: PauseScope
  pauseReason?: string | null
  serviceState?: string | null
}): GatewayServiceState {
  if (
    device.serviceState &&
    (GATEWAY_SERVICE_STATES as readonly string[]).includes(device.serviceState)
  ) {
    // Prefer live derivation over stale stored values for online/offline
  }

  if (!device.isActive) return 'STOPPED_BY_USER'
  if (!device.boundDeviceFingerprint) return 'WAITING_FOR_NETWORK'

  const latest = getGatewayLatestActivity(device)
  const recent = latest ? Date.now() - latest.getTime() <= getGatewayOnlineThresholdMs() : false

  if (device.isGatewayRunning === false && device.pauseScope === 'GATEWAY') {
    return 'STOPPED_BY_USER'
  }

  if (device.isGatewayRunning === false && !recent) {
    return 'OFFLINE'
  }

  if (device.isGatewayRunning === false && recent) {
    return 'STOPPED_BY_USER'
  }

  if (!latest) return 'WAITING_FOR_NETWORK'
  if (!recent) return 'OFFLINE'

  if (device.isGatewayRunning === true) return 'RUNNING'
  return 'ONLINE'
}

export function deriveSimProcessingState(input: {
  subscriptionId?: string | null
  requiresTopUp?: boolean
  pauseScope?: PauseScope
  pausedSubscriptionId?: string | null
  failureCategory?: string | null
  isActive?: boolean
}): SimProcessingState {
  if (input.isActive === false) return 'INACTIVE'
  if (input.requiresTopUp) return 'PAUSED_TOP_UP'
  if (
    input.pauseScope === 'SIM' &&
    input.pausedSubscriptionId &&
    input.subscriptionId &&
    input.pausedSubscriptionId === input.subscriptionId
  ) {
    if (input.failureCategory === 'RATE_LIMIT') return 'PAUSED_RATE_LIMIT'
    if (input.failureCategory === 'MODEM_FAILURE') return 'PAUSED_MODEM_FAILURE'
    if (input.failureCategory === 'SIM_UNAVAILABLE') return 'SIM_UNAVAILABLE'
    return 'PAUSED_TOP_UP'
  }
  return 'ACTIVE'
}

export function deriveSyncHealthState(input: {
  lastSuccessfulStatusAt?: Date | string | null
  lastTransientError?: string | null
  consecutiveTransientFailures?: number | null
  lastSyncAt?: Date | string | null
}): SyncHealthState {
  const failures = input.consecutiveTransientFailures || 0
  if (failures > 0 && input.lastTransientError) {
    return failures >= 3 ? 'RETRYING' : 'PENDING'
  }
  if (input.lastSuccessfulStatusAt || input.lastSyncAt) return 'UP_TO_DATE'
  return 'UNKNOWN'
}

/** A SIM pause must not make the whole gateway look stopped. */
export function isGatewayEligibleForWork(device: {
  isActive?: boolean
  requiresTopUp?: boolean
  pauseScope?: PauseScope
  pausedAt?: Date | string | null
  serviceState?: GatewayServiceState | null
}): boolean {
  if (!device.isActive) return false
  // Legacy: requiresTopUp blocked all work — keep blocking only when pause is SIM-wide or gateway
  if (device.requiresTopUp && device.pauseScope !== 'SIM') return false
  if (device.pauseScope === 'GATEWAY' && device.pausedAt) return false
  const service = device.serviceState || deriveGatewayServiceState(device as Parameters<typeof deriveGatewayServiceState>[0])
  return service === 'ONLINE' || service === 'RUNNING' || service === 'SYNCHRONIZING'
}

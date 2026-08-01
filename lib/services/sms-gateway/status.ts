/**
 * Gateway connection / service status helpers for dashboard APIs.
 */

import {
  deriveGatewayServiceState,
  deriveSimProcessingState,
  deriveSyncHealthState,
  getGatewayLatestActivity,
  getGatewayOnlineThresholdMs,
  isGatewayEligibleForWork,
  type GatewayServiceState,
  type SimProcessingState,
  type SyncHealthState,
} from './states'

export type GatewayConnectionStatus =
  | 'online'
  | 'offline'
  | 'stopped'
  | 'waiting'
  | 'not_connected'
  | 'synchronizing'
  | 'waiting_for_network'

export {
  getGatewayOnlineThresholdMs,
  getGatewayLatestActivity,
  deriveGatewayServiceState,
  deriveSimProcessingState,
  deriveSyncHealthState,
  isGatewayEligibleForWork,
}

export function computeGatewayConnectionStatus(device: {
  isActive?: boolean
  boundDeviceFingerprint?: string | null
  isGatewayRunning?: boolean | null
  lastHeartbeatAt?: Date | string | null
  lastSyncAt?: Date | string | null
  pausedAt?: Date | string | null
  pauseScope?: 'GATEWAY' | 'SIM' | null
  pauseReason?: string | null
  serviceState?: string | null
  consecutiveTransientFailures?: number | null
  lastTransientError?: string | null
  lastSuccessfulStatusAt?: Date | string | null
  requiresTopUp?: boolean
}): {
  connectionStatus: GatewayConnectionStatus
  isOnline: boolean
  latestActivityAt: Date | null
  serviceState: GatewayServiceState
  syncHealth: SyncHealthState
  deviceOnline: boolean
  deviceSynchronized: boolean
} {
  const serviceState = deriveGatewayServiceState(device)
  const syncHealth = deriveSyncHealthState(device)
  const latestActivityAt = getGatewayLatestActivity(device)

  if (!device.isActive) {
    return {
      connectionStatus: 'not_connected',
      isOnline: false,
      latestActivityAt: null,
      serviceState,
      syncHealth,
      deviceOnline: false,
      deviceSynchronized: false,
    }
  }

  if (!device.boundDeviceFingerprint) {
    return {
      connectionStatus: 'waiting',
      isOnline: false,
      latestActivityAt,
      serviceState: 'WAITING_FOR_NETWORK',
      syncHealth,
      deviceOnline: false,
      deviceSynchronized: false,
    }
  }

  const deviceOnline =
    serviceState === 'ONLINE' ||
    serviceState === 'RUNNING' ||
    serviceState === 'SYNCHRONIZING'

  const deviceSynchronized = syncHealth === 'UP_TO_DATE'

  let connectionStatus: GatewayConnectionStatus
  switch (serviceState) {
    case 'RUNNING':
    case 'ONLINE':
      connectionStatus = syncHealth === 'RETRYING' || syncHealth === 'PENDING' ? 'synchronizing' : 'online'
      break
    case 'STOPPED_BY_USER':
      connectionStatus = 'stopped'
      break
    case 'WAITING_FOR_NETWORK':
      connectionStatus = 'waiting_for_network'
      break
    case 'SYNCHRONIZING':
      connectionStatus = 'synchronizing'
      break
    case 'OFFLINE':
    case 'START_FAILED':
    default:
      connectionStatus = 'offline'
      break
  }

  return {
    connectionStatus,
    isOnline: deviceOnline,
    latestActivityAt,
    serviceState,
    syncHealth,
    deviceOnline,
    deviceSynchronized,
  }
}

export function listSimStates(device: {
  activeSubscriptions?: Array<{ subscriptionId: string; label?: string; state?: string }>
  boundSimLabel?: string | null
  requiresTopUp?: boolean
  pauseScope?: 'GATEWAY' | 'SIM' | null
  pausedSubscriptionId?: string | null
  failureCategory?: string | null
}): Array<{ subscriptionId: string; label: string; state: SimProcessingState }> {
  const subs = device.activeSubscriptions?.length
    ? device.activeSubscriptions
    : device.boundSimLabel
      ? [{ subscriptionId: 'default', label: device.boundSimLabel }]
      : [{ subscriptionId: 'sim1', label: 'SIM 1' }]

  return subs.map((sub, index) => {
    const subscriptionId = sub.subscriptionId || `sim${index + 1}`
    const state = deriveSimProcessingState({
      subscriptionId,
      requiresTopUp:
        Boolean(device.requiresTopUp) &&
        (!device.pausedSubscriptionId || device.pausedSubscriptionId === subscriptionId),
      pauseScope: device.pauseScope,
      pausedSubscriptionId: device.pausedSubscriptionId,
      failureCategory: device.failureCategory,
      isActive: true,
    })
    return {
      subscriptionId,
      label: sub.label || `SIM ${index + 1}`,
      state,
    }
  })
}

/** @deprecated Use computeGatewayConnectionStatus instead */
export function isDeviceOnline(
  lastHeartbeatAt?: Date | string | null,
  lastSyncAt?: Date | string | null,
  isGatewayRunning?: boolean | null
): boolean {
  const { isOnline } = computeGatewayConnectionStatus({
    isActive: true,
    boundDeviceFingerprint: 'bound',
    isGatewayRunning,
    lastHeartbeatAt,
    lastSyncAt,
  })
  return isOnline
}

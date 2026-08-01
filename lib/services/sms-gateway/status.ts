export type GatewayConnectionStatus =
  | 'online'
  | 'offline'
  | 'stopped'
  | 'waiting'
  | 'not_connected'

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

export function computeGatewayConnectionStatus(device: {
  isActive?: boolean
  boundDeviceFingerprint?: string | null
  isGatewayRunning?: boolean | null
  lastHeartbeatAt?: Date | string | null
  lastSyncAt?: Date | string | null
}): {
  connectionStatus: GatewayConnectionStatus
  isOnline: boolean
  latestActivityAt: Date | null
} {
  if (!device.isActive) {
    return { connectionStatus: 'not_connected', isOnline: false, latestActivityAt: null }
  }

  if (!device.boundDeviceFingerprint) {
    return {
      connectionStatus: 'waiting',
      isOnline: false,
      latestActivityAt: getGatewayLatestActivity(device),
    }
  }

  const latestActivityAt = getGatewayLatestActivity(device)
  const thresholdMs = getGatewayOnlineThresholdMs()

  if (device.isGatewayRunning === false) {
    return { connectionStatus: 'stopped', isOnline: false, latestActivityAt }
  }

  if (!latestActivityAt) {
    return { connectionStatus: 'waiting', isOnline: false, latestActivityAt: null }
  }

  const isRecent = Date.now() - latestActivityAt.getTime() <= thresholdMs

  if (device.isGatewayRunning === true && isRecent) {
    return { connectionStatus: 'online', isOnline: true, latestActivityAt }
  }

  if (!isRecent) {
    return { connectionStatus: 'offline', isOnline: false, latestActivityAt }
  }

  // Recent activity but gateway not confirmed running
  return { connectionStatus: 'offline', isOnline: false, latestActivityAt }
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

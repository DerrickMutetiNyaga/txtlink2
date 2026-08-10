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
  lastSeenAt?: Date | string | null
  lastPendingRequestAt?: Date | string | null
  lastHttpAt?: Date | string | null
  lastStatusUpdateAt?: Date | string | null
}): Date | null {
  const dates = [
    device.lastHeartbeatAt,
    device.lastSyncAt,
    device.lastSeenAt,
    device.lastPendingRequestAt,
    device.lastHttpAt,
    device.lastStatusUpdateAt,
  ].filter(Boolean)
  if (!dates.length) return null
  return new Date(Math.max(...dates.map((d) => new Date(d as Date).getTime())))
}

export function computeGatewayConnectionStatus(device: {
  isActive?: boolean
  boundDeviceFingerprint?: string | null
  isGatewayRunning?: boolean | null
  lastHeartbeatAt?: Date | string | null
  lastSyncAt?: Date | string | null
  lastSeenAt?: Date | string | null
  lastPendingRequestAt?: Date | string | null
  lastHttpAt?: Date | string | null
  lastStatusUpdateAt?: Date | string | null
}): {
  connectionStatus: GatewayConnectionStatus
  isOnline: boolean
  latestActivityAt: Date | null
  secondsSinceLastContact: number | null
} {
  if (!device.isActive) {
    return {
      connectionStatus: 'not_connected',
      isOnline: false,
      latestActivityAt: null,
      secondsSinceLastContact: null,
    }
  }

  if (!device.boundDeviceFingerprint) {
    const latestActivityAt = getGatewayLatestActivity(device)
    return {
      connectionStatus: 'waiting',
      isOnline: false,
      latestActivityAt,
      secondsSinceLastContact: latestActivityAt
        ? Math.max(0, Math.floor((Date.now() - latestActivityAt.getTime()) / 1000))
        : null,
    }
  }

  const latestActivityAt = getGatewayLatestActivity(device)
  const thresholdMs = getGatewayOnlineThresholdMs()
  const secondsSinceLastContact = latestActivityAt
    ? Math.max(0, Math.floor((Date.now() - latestActivityAt.getTime()) / 1000))
    : null

  if (device.isGatewayRunning === false) {
    return {
      connectionStatus: 'stopped',
      isOnline: false,
      latestActivityAt,
      secondsSinceLastContact,
    }
  }

  if (!latestActivityAt) {
    return {
      connectionStatus: 'waiting',
      isOnline: false,
      latestActivityAt: null,
      secondsSinceLastContact: null,
    }
  }

  const isRecent = Date.now() - latestActivityAt.getTime() <= thresholdMs

  if (device.isGatewayRunning === true && isRecent) {
    return {
      connectionStatus: 'online',
      isOnline: true,
      latestActivityAt,
      secondsSinceLastContact,
    }
  }

  if (!isRecent) {
    return {
      connectionStatus: 'offline',
      isOnline: false,
      latestActivityAt,
      secondsSinceLastContact,
    }
  }

  // Recent activity but gateway not confirmed running
  return {
    connectionStatus: 'offline',
    isOnline: false,
    latestActivityAt,
    secondsSinceLastContact,
  }
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

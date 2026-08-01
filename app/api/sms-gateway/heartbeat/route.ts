import { NextRequest, NextResponse } from 'next/server'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
  getClientIp,
} from '@/lib/services/sms-gateway/auth'
import { deriveGatewayServiceState, deriveSyncHealthState } from '@/lib/services/sms-gateway/states'
import { logGatewayAudit } from '@/lib/services/sms-gateway/audit'
import { getGatewayOnlineThresholdMs } from '@/lib/services/sms-gateway/status'

const ROUTE = 'POST /api/sms-gateway/heartbeat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const auth = await validateGatewayDevice(request, { route: ROUTE, body })

    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    const now = new Date()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceName =
      (typeof body.deviceName === 'string' ? body.deviceName : '') ||
      auth.identity.deviceName
    const simLabel =
      (typeof body.simLabel === 'string' ? body.simLabel : '') || auth.identity.simLabel

    const wasOffline =
      !auth.device.lastHeartbeatAt ||
      Date.now() - new Date(auth.device.lastHeartbeatAt).getTime() >
        getGatewayOnlineThresholdMs()

    auth.device.lastHeartbeatAt = now
    auth.device.lastSyncAt = now
    if (deviceName) auth.device.boundDeviceName = deviceName
    if (simLabel) auth.device.boundSimLabel = simLabel
    if (body.appVersion !== undefined) auth.device.appVersion = body.appVersion
    if (body.batteryLevel !== undefined) auth.device.batteryLevel = body.batteryLevel
    if (body.isSmsPermissionGranted !== undefined) {
      auth.device.isSmsPermissionGranted = body.isSmsPermissionGranted
    }
    if (body.isGatewayRunning !== undefined) {
      auth.device.isGatewayRunning = body.isGatewayRunning
    } else if (auth.device.isGatewayRunning !== false) {
      auth.device.isGatewayRunning = true
    }

    if (Array.isArray(body.activeSubscriptions)) {
      auth.device.activeSubscriptions = body.activeSubscriptions
        .filter((s: any) => s && (s.subscriptionId || s.id))
        .map((s: any) => ({
          subscriptionId: String(s.subscriptionId || s.id),
          label: s.label ? String(s.label) : undefined,
          state: s.state ? String(s.state) : undefined,
        }))
    }

    // Successful heartbeat clears transient counters — never pauses gateway
    auth.device.consecutiveTransientFailures = 0
    auth.device.lastTransientError = undefined
    auth.device.serviceState = deriveGatewayServiceState(auth.device)
    auth.device.syncHealth = deriveSyncHealthState(auth.device)
    auth.device.lastIp = getClientIp(request)
    auth.device.lastUserAgent = userAgent

    await auth.device.save()

    if (wasOffline) {
      await logGatewayAudit(String(auth.device.userId), 'GATEWAY_ONLINE', String(auth.device._id), {
        serviceState: auth.device.serviceState,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
      serviceState: auth.device.serviceState,
      syncHealth: auth.device.syncHealth,
      // Instruct Android: do not stop foreground service on transient issues
      keepRunning: true,
      pauseGateway: false,
    })
  } catch (error: any) {
    console.error('SMS gateway heartbeat error:', error)
    // Heartbeat handler failure must not instruct the app to stop
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        keepRunning: true,
        pauseGateway: false,
      },
      { status: 500 }
    )
  }
}

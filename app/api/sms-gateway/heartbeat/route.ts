import { NextRequest, NextResponse } from 'next/server'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
  getClientIp,
} from '@/lib/services/sms-gateway/auth'

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
    }
    auth.device.lastIp = getClientIp(request)
    auth.device.lastUserAgent = userAgent

    await auth.device.save()

    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
    })
  } catch (error: any) {
    console.error('SMS gateway heartbeat error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

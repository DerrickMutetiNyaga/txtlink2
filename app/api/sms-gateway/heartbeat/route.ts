import { NextRequest, NextResponse } from 'next/server'
import { authenticateGatewayDevice, getClientIp } from '@/lib/services/sms-gateway/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const deviceName = body.deviceName || ''
    const simLabel = body.simLabel || ''

    const auth = await authenticateGatewayDevice(request, deviceName, simLabel)

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    const now = new Date()
    const userAgent = request.headers.get('user-agent') || 'unknown'

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

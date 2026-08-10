import { NextRequest, NextResponse } from 'next/server'
import { SmsGatewayDevice } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
  getClientIp,
} from '@/lib/services/sms-gateway/auth'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { buildServerTimingHeader, elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'

const ROUTE = 'POST /api/sms-gateway/heartbeat'

/**
 * Lightweight heartbeat: updateOne only — no aggregations, no queue scans.
 * Updates lastHeartbeatAt, lastSeenAt, and gateway status fields.
 */
export async function POST(request: NextRequest) {
  const startedAt = nowMs()
  let deviceId: unknown = null
  let gatewayDeviceIdHeader: string | null = request.headers.get('x-gateway-device-id')

  try {
    const body = await request.json().catch(() => ({}))
    const auth = await validateGatewayDevice(request, { route: ROUTE, body })

    if (!auth.ok) {
      const totalMs = elapsedMs(startedAt)
      await recordGatewayConnectionDiagnostic({
        deviceId: null,
        route: ROUTE,
        httpStatus: auth.status,
        durationMs: totalMs,
        kind: 'heartbeat',
        gatewayDeviceIdHeader,
      }).catch(() => undefined)
      return gatewayAuthErrorResponse(auth)
    }

    deviceId = auth.device._id
    gatewayDeviceIdHeader =
      auth.identity.deviceId || request.headers.get('x-gateway-device-id')

    const now = new Date()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceName =
      (typeof body.deviceName === 'string' ? body.deviceName : '') ||
      auth.identity.deviceName
    const simLabel =
      (typeof body.simLabel === 'string' ? body.simLabel : '') || auth.identity.simLabel

    const $set: Record<string, unknown> = {
      lastHeartbeatAt: now,
      lastSeenAt: now,
      lastSyncAt: now,
      lastIp: getClientIp(request),
      lastUserAgent: userAgent,
    }

    if (deviceName) $set.boundDeviceName = deviceName
    if (simLabel) $set.boundSimLabel = simLabel
    if (body.appVersion !== undefined) $set.appVersion = body.appVersion
    if (body.batteryLevel !== undefined) $set.batteryLevel = body.batteryLevel
    if (body.isSmsPermissionGranted !== undefined) {
      $set.isSmsPermissionGranted = body.isSmsPermissionGranted
    }
    if (body.isGatewayRunning !== undefined) {
      $set.isGatewayRunning = body.isGatewayRunning
    }

    const dbStart = nowMs()
    await SmsGatewayDevice.updateOne({ _id: deviceId }, { $set })
    const dbMs = elapsedMs(dbStart)
    const totalMs = elapsedMs(startedAt)

    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 200,
      durationMs: totalMs,
      dbQueryDurationMs: dbMs,
      kind: 'heartbeat',
      gatewayDeviceIdHeader,
    })

    const response = NextResponse.json({
      success: true,
      message: 'Heartbeat received',
      timing: { dbMs, totalMs },
    })
    response.headers.set('Server-Timing', buildServerTimingHeader({ db: dbMs, total: totalMs }))
    response.headers.set('X-Gateway-Db-Ms', String(dbMs))
    response.headers.set('X-Gateway-Total-Ms', String(totalMs))
    return response
  } catch (error: any) {
    console.error('SMS gateway heartbeat error:', error)
    const totalMs = elapsedMs(startedAt)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: totalMs,
      kind: 'heartbeat',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

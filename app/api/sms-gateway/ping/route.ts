import { NextRequest, NextResponse } from 'next/server'
import { SmsGatewayDevice } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
  getClientIp,
} from '@/lib/services/sms-gateway/auth'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { buildServerTimingHeader, elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'

const ROUTE = 'GET /api/sms-gateway/ping'

export async function GET(request: NextRequest) {
  const startedAt = nowMs()
  let deviceId: unknown = null
  let gatewayDeviceIdHeader: string | null = request.headers.get('x-gateway-device-id')

  try {
    const auth = await validateGatewayDevice(request, { route: ROUTE })

    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    deviceId = auth.device._id
    gatewayDeviceIdHeader =
      auth.identity.deviceId || request.headers.get('x-gateway-device-id')

    const now = new Date()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const dbStart = nowMs()
    await SmsGatewayDevice.updateOne(
      { _id: deviceId },
      {
        $set: {
          lastSeenAt: now,
          lastIp: getClientIp(request),
          lastUserAgent: userAgent,
        },
      }
    )
    const dbMs = elapsedMs(dbStart)
    const totalMs = elapsedMs(startedAt)

    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 200,
      durationMs: totalMs,
      dbQueryDurationMs: dbMs,
      kind: 'ping',
      gatewayDeviceIdHeader,
    })

    const response = NextResponse.json({
      success: true,
      message: 'Gateway connected',
      timing: { dbMs, totalMs },
    })
    response.headers.set('Server-Timing', buildServerTimingHeader({ db: dbMs, total: totalMs }))
    return response
  } catch (error: any) {
    console.error('SMS gateway ping error:', error)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: elapsedMs(startedAt),
      kind: 'ping',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

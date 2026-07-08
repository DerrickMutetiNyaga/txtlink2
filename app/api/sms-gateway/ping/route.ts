import { NextRequest, NextResponse } from 'next/server'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
  getClientIp,
} from '@/lib/services/sms-gateway/auth'

const ROUTE = 'GET /api/sms-gateway/ping'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateGatewayDevice(request, { route: ROUTE })

    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    const userAgent = request.headers.get('user-agent') || 'unknown'
    auth.device.lastIp = getClientIp(request)
    auth.device.lastUserAgent = userAgent
    await auth.device.save()

    return NextResponse.json({
      success: true,
      message: 'Gateway connected',
    })
  } catch (error: any) {
    console.error('SMS gateway ping error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

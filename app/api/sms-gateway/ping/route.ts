import { NextRequest, NextResponse } from 'next/server'
import { authenticateGatewayDevice, getClientIp } from '@/lib/services/sms-gateway/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceName = searchParams.get('deviceName') || ''
    const simLabel = searchParams.get('simLabel') || ''

    const auth = await authenticateGatewayDevice(request, deviceName, simLabel)

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
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

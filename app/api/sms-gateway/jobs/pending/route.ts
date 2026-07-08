import { NextRequest, NextResponse } from 'next/server'
import { authenticateGatewayDevice } from '@/lib/services/sms-gateway/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10) || 5, 50)

    const auth = await authenticateGatewayDevice(request)

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    return NextResponse.json({
      success: true,
      jobs: [],
      limit,
    })
  } catch (error: any) {
    console.error('SMS gateway pending jobs error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

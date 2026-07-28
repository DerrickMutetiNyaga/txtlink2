import { NextRequest, NextResponse } from 'next/server'
import { getCronSecret } from '@/lib/services/sms-fallback/config'
import { resendProviderOutageFailures } from '@/lib/services/sms/resend-provider-outages'

function authorize(request: NextRequest): boolean {
  const secret = getCronSecret()
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') === secret) return true

  return false
}

/**
 * POST /api/internal/sms/resend-provider-outages
 * Resends SMS that failed with HostPinnacle HTML 503/outage errors.
 */
export async function POST(request: NextRequest) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitRaw = parseInt(searchParams.get('limit') || '100', 10)
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500)

    const result = await resendProviderOutageFailures(limit)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Resend provider outages error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

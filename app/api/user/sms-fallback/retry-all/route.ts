/**
 * Bulk retry pending/failed SMS via HostPinnacle or phone gateway.
 * POST /api/user/sms-fallback/retry-all
 * Body: { channel: 'provider' | 'phone', view?: 'failed' | 'pending' | 'all', limit?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireAuth } from '@/lib/auth/middleware'
import { bulkRetryActionableSms } from '@/lib/services/sms-fallback/bulk-retry'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    let body: { channel?: string; view?: string; limit?: number } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    if (body.channel !== 'provider' && body.channel !== 'phone') {
      return NextResponse.json(
        {
          error:
            "channel is required: 'provider' (HostPinnacle / Sender ID API) or 'phone' (Android gateway)",
        },
        { status: 400 }
      )
    }

    const result = await bulkRetryActionableSms({
      userId: user.userId,
      channel: body.channel,
      view: body.view || 'failed',
      limit: body.limit,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const err = error as { message?: string }
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Bulk retry-all error:', error)
    return NextResponse.json({ error: 'Failed to retry messages' }, { status: 500 })
  }
}

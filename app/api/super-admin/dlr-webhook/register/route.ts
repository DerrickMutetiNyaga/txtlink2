/**
 * Register DLR Webhook with HostPinnacle
 * POST /api/super-admin/dlr-webhook/register
 *
 * One-time setup: tells HostPinnacle to send delivery reports to this app's /api/sms/dlr.
 * Only super-admin (owner) can call this.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/middleware'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'

export async function POST(request: NextRequest) {
  try {
    requireOwner(request)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'NEXT_PUBLIC_BASE_URL is not set. Set it to your app URL (e.g. https://yourdomain.com).' },
        { status: 400 }
      )
    }

    const secret = process.env.WEBHOOK_SECRET
    const dlrUrl = secret
      ? `${baseUrl.replace(/\/$/, '')}/api/sms/dlr?secret=${encodeURIComponent(secret)}`
      : `${baseUrl.replace(/\/$/, '')}/api/sms/dlr`

    const result = await hostPinnacleClient.createWebhook({
      smsWebhook: dlrUrl,
      smsWebhookRate: 10,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'HostPinnacle webhook registration failed', message: result.message },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'DLR webhook registered with HostPinnacle.',
      dlrUrl,
    })
  } catch (e: any) {
    if (e.message === 'Forbidden' || e.message === 'Unauthorized') {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    return NextResponse.json(
      { success: false, error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

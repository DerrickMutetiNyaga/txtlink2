/**
 * Register DLR Webhook with HostPinnacle
 * GET  /api/super-admin/dlr-webhook/register — preview configured DLR URL
 * POST /api/super-admin/dlr-webhook/register — register / re-register with HostPinnacle
 *
 * Safe to call POST multiple times when testing if HostPinnacle fixed webhook delivery.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/middleware'
import { buildDlrWebhookUrl } from '@/lib/services/hostpinnacle/dlr-webhook-url'
import { registerDlrWebhook } from '@/lib/services/hostpinnacle/register-dlr-webhook'

export async function GET(request: NextRequest) {
  try {
    requireOwner(request)

    const { dlrUrl, hasSecret } = buildDlrWebhookUrl()

    return NextResponse.json({
      success: true,
      dlrUrl,
      hasSecret,
      endpoint: '/api/sms/dlr',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    if (message === 'Forbidden' || message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    requireOwner(request)

    const result = await registerDlrWebhook()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'HostPinnacle webhook registration failed',
          message: result.message,
          dlrUrl: result.dlrUrl,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'DLR webhook registered with HostPinnacle.',
      dlrUrl: result.dlrUrl,
      hasSecret: result.hasSecret,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    if (message === 'Forbidden' || message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * Register DLR Webhook with HostPinnacle
 * GET  /api/super-admin/dlr-webhook/register — preview configured DLR URL
 *       ?previewBaseUrl=https://example.com — live preview without saving
 * POST /api/super-admin/dlr-webhook/register — register / re-register with HostPinnacle
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/middleware'
import {
  buildDlrWebhookUrl,
  buildDlrWebhookUrlFromSettings,
} from '@/lib/services/hostpinnacle/dlr-webhook-url'
import { registerDlrWebhook } from '@/lib/services/hostpinnacle/register-dlr-webhook'

export async function GET(request: NextRequest) {
  try {
    requireOwner(request)

    const previewBase = request.nextUrl.searchParams.get('previewBaseUrl')?.trim()
    if (previewBase) {
      const baseUrl = previewBase.replace(/\/$/, '')
      const { dlrUrl, hasSecret } = buildDlrWebhookUrl(baseUrl)
      return NextResponse.json({
        success: true,
        dlrUrl,
        hasSecret,
        baseUrl,
        source: 'preview',
        endpoint: '/api/sms/dlr',
      })
    }

    const { dlrUrl, hasSecret, baseUrl, source } = await buildDlrWebhookUrlFromSettings()

    return NextResponse.json({
      success: true,
      dlrUrl,
      hasSecret,
      baseUrl,
      source,
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

    let baseUrl: string | undefined
    try {
      const body = await request.json()
      baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl : undefined
    } catch {
      // No body — use saved/env URL
    }

    const result = await registerDlrWebhook({ baseUrl, persistBaseUrl: !!baseUrl })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'HostPinnacle webhook registration failed',
          message: result.message,
          dlrUrl: result.dlrUrl,
          baseUrl: result.baseUrl,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'DLR webhook registered with HostPinnacle.',
      dlrUrl: result.dlrUrl,
      hasSecret: result.hasSecret,
      baseUrl: result.baseUrl,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    if (message === 'Forbidden' || message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * Super Admin System Health
 * GET /api/super-admin/system-health
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/middleware'
import { checkSystemHealth } from '@/lib/services/system-health/check-system-health'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireOwner(request)
    const report = await checkSystemHealth()
    return NextResponse.json({ success: true, ...report })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    if (message === 'Forbidden' || message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    console.error('System health check error:', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

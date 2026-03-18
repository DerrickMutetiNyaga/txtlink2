/**
 * Cron endpoint: SMS Status Background Job
 *
 * GET /api/cron/sms-status
 *
 * This endpoint is intended to be called by a scheduler (e.g. Vercel Cron, CRON job)
 * every few minutes. It checks the delivery status of in-flight SMS messages
 * by calling the HostPinnacle status API.
 * 
 * Can also be called manually by super admin for immediate status sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { checkPendingSmsStatuses } from '@/lib/services/sms/status-job'
import { requireOwner } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Check if this is a manual call (has auth header) - require owner
    // If no auth, assume it's a cron job (public endpoint)
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      try {
        requireOwner(request)
      } catch (authError: any) {
        return NextResponse.json(
          { success: false, error: authError.message || 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

    console.log(`[SMS Status Cron] Starting status check for up to ${limit} messages...`)
    await checkPendingSmsStatuses(limit)
    console.log(`[SMS Status Cron] Status check completed`)

    return NextResponse.json({
      success: true,
      message: 'SMS status job executed',
      limit,
    })
  } catch (error: any) {
    console.error('SMS status cron error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}



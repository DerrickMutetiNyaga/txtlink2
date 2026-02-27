/**
 * Cron endpoint: SMS Status Background Job
 *
 * GET /api/cron/sms-status
 *
 * This endpoint is intended to be called by a scheduler (e.g. Vercel Cron, CRON job)
 * every few minutes. It checks the delivery status of in-flight SMS messages
 * by calling the HostPinnacle status API.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { checkPendingSmsStatuses } from '@/lib/services/sms/status-job'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

    await checkPendingSmsStatuses(limit)

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



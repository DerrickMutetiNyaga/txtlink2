/**
 * Admin Manual Status Sync
 * POST /api/super-admin/sms-status/sync?limit=100
 *
 * Super-admin only. Runs one synchronization batch immediately using the
 * exact same SmsStatusSynchronizer service as the Render background worker -
 * there is no duplicated sync logic here.
 *
 * The background worker remains the source of continuous synchronization;
 * this endpoint exists for on-demand verification by operators.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireOwner } from '@/lib/auth/middleware'
import { getSharedSynchronizer } from '@/lib/services/sms-status/build-synchronizer'
import { statusRepository } from '@/lib/services/sms-status/status-repository'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    try {
      requireOwner(request)
    } catch (authError: any) {
      return NextResponse.json(
        { success: false, error: authError.message || 'Unauthorized' },
        { status: authError.message === 'Forbidden' ? 403 : 401 }
      )
    }

    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100

    const { synchronizer, config } = await getSharedSynchronizer()

    const summary = await synchronizer.syncBatch({
      workerId: `admin-sync-${config.workerId}`,
      batchSize: limit,
      leaseSeconds: config.claimLeaseSeconds,
    })

    const stillDue = await statusRepository.countDue()

    return NextResponse.json({
      success: true,
      message: 'Manual status sync executed',
      summary,
      stillDue,
    })
  } catch (error: any) {
    console.error('Manual status sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

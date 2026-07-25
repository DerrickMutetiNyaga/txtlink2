/**
 * Sync pending SMS delivery statuses with HostPinnacle for the current user.
 * POST /api/user/sms/history/sync-pending
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireAuth } from '@/lib/auth/middleware'
import { syncUserPendingMessages } from '@/lib/services/sms-status/sync-user-pending'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 25

    const result = await syncUserPendingMessages(user.userId, limit)

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const err = error as { message?: string }
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Sync pending SMS status error:', error)
    return NextResponse.json({ error: 'Failed to sync delivery status' }, { status: 500 })
  }
}

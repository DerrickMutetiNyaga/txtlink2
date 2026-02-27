/**
 * SMS Queue Status API
 * GET /api/sms/queue-status
 * 
 * Returns current queue status for monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { advancedSmsQueue } from '@/lib/services/sms/advanced-queue'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const userObjectId = new mongoose.Types.ObjectId(user.userId)

    // Get global status
    const globalStatus = advancedSmsQueue.getStatus()
    
    // Get account-specific status
    const accountStatus = advancedSmsQueue.getAccountStatus(userObjectId)

    return NextResponse.json({
      success: true,
      global: globalStatus,
      account: accountStatus,
    })
  } catch (error: any) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get queue status' },
      { status: 500 }
    )
  }
}


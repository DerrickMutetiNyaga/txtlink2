/**
 * SMS Queue Status API
 * GET /api/sms/queue-status
 * 
 * Returns current queue status for monitoring
 * Accessible to authenticated users (for their account) and super admin (for all accounts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { requireOwner } from '@/lib/auth/middleware'
import { advancedSmsQueue } from '@/lib/services/sms/advanced-queue'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    // Try to get owner first (for super admin access)
    let isOwner = false
    let user: any = null
    
    try {
      user = requireOwner(request)
      isOwner = true
    } catch {
      // Not owner, try regular auth
      user = requireAuth(request)
    }

    // Get global status
    const globalStatus = advancedSmsQueue.getStatus()
    
    if (isOwner) {
      // Super admin gets full status
      return NextResponse.json({
        success: true,
        global: globalStatus,
        isOwner: true,
      })
    } else {
      // Regular user gets their account status
      const userObjectId = new mongoose.Types.ObjectId(user.userId)
      const accountStatus = advancedSmsQueue.getAccountStatus(userObjectId)

      return NextResponse.json({
        success: true,
        global: {
          globalActiveWorkers: globalStatus.globalActiveWorkers,
          totalQueued: globalStatus.totalQueued,
          isRunning: globalStatus.isRunning,
        },
        account: accountStatus,
        isOwner: false,
      })
    }
  } catch (error: any) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get queue status' },
      { status: 500 }
    )
  }
}


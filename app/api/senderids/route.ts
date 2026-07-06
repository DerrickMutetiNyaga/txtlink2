/**
 * Get Sender IDs API
 * GET /api/senderids
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderId, UserSenderId, SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    // Convert userId string to ObjectId
    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(user.userId)

    // Get all sender IDs linked to this user
    const userSenderIds = await UserSenderId.find({ userId: userObjectId }).populate('senderId')

    // Get usage statistics for each sender ID
    const senderIdsWithStats = await Promise.all(
      userSenderIds.map(async (usi) => {
        const sid = usi.senderId as any
        
        // Count messages sent with this sender ID
        const messageCount = await SmsMessage.countDocuments({
          userId: userObjectId,
          senderName: sid.senderName,
        })

        // Map status: 'active' -> 'approved', 'pending' -> 'pending', 'rejected' -> 'rejected'
        let displayStatus = sid.status
        if (sid.status === 'active') {
          displayStatus = 'approved'
        }

        return {
          id: sid._id?.toString(),
          senderName: sid.senderName,
          status: displayStatus,
          isDefault: usi.isDefault,
          createdAt: sid.createdAt,
          usage: messageCount,
        }
      })
    )

    return NextResponse.json({
      success: true,
      senderIds: senderIdsWithStats,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get sender IDs error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


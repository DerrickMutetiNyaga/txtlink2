/**
 * Super Admin: Unassign Sender ID from User
 * POST /api/super-admin/accounts/[id]/senderids/unassign
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, UserSenderId } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAuditAction } from '@/lib/utils/audit'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const { id: userId } = await params

    const { senderId } = await request.json()

    if (!senderId) {
      return NextResponse.json({ error: 'senderId is required' }, { status: 400 })
    }

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const senderIdObjectId = new mongoose.Types.ObjectId(senderId)
    const userSenderId = await UserSenderId.findOne({
      userId: userObjectId,
      senderId: senderIdObjectId,
    })

    if (!userSenderId) {
      return NextResponse.json({ error: 'Sender ID is not assigned to this user' }, { status: 404 })
    }

    const wasDefault = userSenderId.isDefault

    // Remove assignment
    await UserSenderId.findByIdAndDelete(userSenderId._id)

    // If it was default, set another one as default (or leave null)
    if (wasDefault) {
      const remaining = await UserSenderId.findOne({ userId: userObjectId })
      if (remaining) {
        await UserSenderId.findByIdAndUpdate(remaining._id, { isDefault: true })
      }
    }

    // Log audit
    await logAuditAction(owner.userId, 'UNASSIGN_SENDERID', 'UserSenderId', userSenderId._id.toString(), {
      userId,
      senderId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unassign sender ID error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}


/**
 * Super Admin: Transfer Sender ID from One User to Another
 * POST /api/super-admin/senderids/transfer
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, UserSenderId, SenderId } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAuditAction } from '@/lib/utils/audit'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    await connectDB()
    const owner = requireOwner(request)

    const { senderId, fromUserId, toUserId, makeDefault } = await request.json()

    if (!senderId || !fromUserId || !toUserId) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'senderId, fromUserId, and toUserId are required' }, { status: 400 })
    }

    const senderIdObjectId = new mongoose.Types.ObjectId(senderId)
    const fromUserObjectId = new mongoose.Types.ObjectId(fromUserId)
    const toUserObjectId = new mongoose.Types.ObjectId(toUserId)

    // Verify users exist
    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserObjectId),
      User.findById(toUserObjectId),
    ])

    if (!fromUser || !toUser) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find current assignment
    const currentAssignment = await UserSenderId.findOne({
      senderId: senderIdObjectId,
      userId: fromUserObjectId,
    }).session(session)

    if (!currentAssignment) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Sender ID is not assigned to the source user' }, { status: 404 })
    }

    // Check if target user already has this sender ID
    const existingAssignment = await UserSenderId.findOne({
      senderId: senderIdObjectId,
      userId: toUserObjectId,
    }).session(session)

    if (existingAssignment) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Sender ID is already assigned to the target user' }, { status: 400 })
    }

    const wasDefault = currentAssignment.isDefault

    // Remove from old user
    await UserSenderId.findByIdAndDelete(currentAssignment._id).session(session)

    // If it was default, set another one as default for old user
    if (wasDefault) {
      const remaining = await UserSenderId.findOne({ userId: fromUserObjectId }).session(session)
      if (remaining) {
        await UserSenderId.findByIdAndUpdate(remaining._id, { isDefault: true }).session(session)
      }
    }

    // Unset defaults for new user if makeDefault is true
    if (makeDefault) {
      await UserSenderId.updateMany({ userId: toUserObjectId }, { isDefault: false }).session(session)
    }

    // Add to new user
    const newAssignment = await UserSenderId.create(
      [
        {
          userId: toUserObjectId,
          senderId: senderIdObjectId,
          isDefault: makeDefault || false,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    // Get sender ID name for audit
    const senderIdDoc = await SenderId.findById(senderIdObjectId)

    // Log audit
    await logAuditAction(owner.userId, 'TRANSFER_SENDERID', 'UserSenderId', newAssignment[0]._id.toString(), {
      senderId,
      senderName: senderIdDoc?.senderName,
      fromUserId,
      fromUserName: fromUser.name,
      toUserId,
      toUserName: toUser.name,
      makeDefault: makeDefault || false,
    })

    return NextResponse.json({
      success: true,
      message: `Sender ID transferred from ${fromUser.name} to ${toUser.name}`,
    })
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Transfer sender ID error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  } finally {
    session.endSession()
  }
}


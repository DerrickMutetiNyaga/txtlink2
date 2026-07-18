/**
 * Super Admin: Replace a user's assigned Sender ID with another
 * POST /api/super-admin/accounts/[id]/senderids/replace
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, SenderId, UserSenderId } from '@/lib/db/models'
import { requireOwner, requireAdmin } from '@/lib/auth/middleware'
import { logAuditAction } from '@/lib/utils/audit'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    await connectDB()

    let admin: any
    try {
      admin = requireOwner(request)
    } catch {
      try {
        admin = requireAdmin(request)
      } catch {
        await session.abortTransaction()
        return NextResponse.json({ error: 'Unauthorized: Owner or Admin access required' }, { status: 403 })
      }
    }

    const { id: userId } = await params
    const { oldSenderId, newSenderId, newSenderName, makeDefault } = await request.json()

    if (!oldSenderId || (!newSenderId && !newSenderName)) {
      await session.abortTransaction()
      return NextResponse.json(
        { error: 'oldSenderId and either newSenderId or newSenderName are required' },
        { status: 400 }
      )
    }

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const user = await User.findById(userObjectId).session(session)
    if (!user) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const oldSenderObjectId = new mongoose.Types.ObjectId(oldSenderId)
    const currentAssignment = await UserSenderId.findOne({
      userId: userObjectId,
      senderId: oldSenderObjectId,
    }).session(session)

    if (!currentAssignment) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Sender ID is not assigned to this user' }, { status: 404 })
    }

    const wasDefault = currentAssignment.isDefault

    let newSenderDoc = null
    if (newSenderId && mongoose.Types.ObjectId.isValid(newSenderId)) {
      newSenderDoc = await SenderId.findById(newSenderId).session(session)
    }
    if (!newSenderDoc && newSenderName) {
      newSenderDoc = await SenderId.findOne({ senderName: newSenderName }).session(session)
      if (!newSenderDoc) {
        newSenderDoc = await SenderId.create(
          [{ senderName: newSenderName, provider: 'hostpinnacle', status: 'active' }],
          { session }
        ).then((docs) => docs[0])
      }
    }

    if (!newSenderDoc) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'New sender ID not found' }, { status: 404 })
    }

    if (newSenderDoc._id.toString() === oldSenderId) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'New sender ID must be different from the current one' }, { status: 400 })
    }

    const existingNewAssignment = await UserSenderId.findOne({
      userId: userObjectId,
      senderId: newSenderDoc._id,
    }).session(session)

    if (
      existingNewAssignment &&
      existingNewAssignment._id.toString() !== currentAssignment._id.toString()
    ) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'New sender ID is already assigned to this user' }, { status: 400 })
    }

    await UserSenderId.deleteOne({ _id: currentAssignment._id }).session(session)

    const shouldBeDefault = makeDefault ?? wasDefault
    if (shouldBeDefault) {
      await UserSenderId.updateMany({ userId: userObjectId }, { isDefault: false }).session(session)
    }

    const userSenderId = await UserSenderId.create(
      [
        {
          userId: userObjectId,
          senderId: newSenderDoc._id,
          isDefault: shouldBeDefault,
        },
      ],
      { session }
    )

    if (wasDefault && !shouldBeDefault) {
      const remaining = await UserSenderId.findOne({ userId: userObjectId }).session(session)
      if (remaining) {
        await UserSenderId.findByIdAndUpdate(remaining._id, { isDefault: true }).session(session)
      }
    }

    await session.commitTransaction()

    try {
      await logAuditAction(
        String(admin.userId),
        'REPLACE_SENDERID',
        'UserSenderId',
        String(userSenderId[0]._id),
        {
          userId,
          oldSenderId,
          newSenderId: String(newSenderDoc._id),
          newSenderName: newSenderDoc.senderName,
          makeDefault: shouldBeDefault,
        }
      )
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return NextResponse.json({
      success: true,
      userSenderId: {
        id: userSenderId[0]._id?.toString(),
        senderId: newSenderDoc._id.toString(),
        senderName: newSenderDoc.senderName,
        status: newSenderDoc.status,
        isDefault: shouldBeDefault,
      },
    })
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Replace sender ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  } finally {
    session.endSession()
  }
}

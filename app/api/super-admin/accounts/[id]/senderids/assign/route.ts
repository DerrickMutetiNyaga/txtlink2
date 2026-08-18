/**
 * Super Admin: Assign Sender ID to User
 * POST /api/super-admin/accounts/[id]/senderids/assign
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireOwner, requireAdmin } from '@/lib/auth/middleware'
import { logAuditAction } from '@/lib/utils/audit'
import { assignSenderIdToUser } from '@/lib/services/senderids/assign-to-user'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    let admin: { userId: string; email: string }
    try {
      admin = await requireOwner(request)
    } catch {
      try {
        admin = requireAdmin(request)
      } catch {
        return NextResponse.json(
          { error: 'Unauthorized: Owner or Admin access required' },
          { status: 403 }
        )
      }
    }

    const { id: userId } = await params
    const { senderId, senderName, makeDefault } = await request.json()

    if (!senderId && !senderName) {
      return NextResponse.json({ error: 'senderId or senderName is required' }, { status: 400 })
    }

    const result = await assignSenderIdToUser({
      userId,
      senderId,
      senderName,
      makeDefault,
    })

    try {
      await logAuditAction(
        String(admin.userId),
        'ASSIGN_SENDERID',
        'UserSenderId',
        result.userSenderIdId,
        {
          userId,
          senderId: result.senderId,
          senderName: result.senderName,
          makeDefault: result.isDefault,
        }
      )
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    return NextResponse.json({
      success: true,
      userSenderId: {
        id: result.userSenderIdId,
        senderId: result.senderId,
        senderName: result.senderName,
        status: result.status,
        isDefault: result.isDefault,
      },
    })
  } catch (error: unknown) {
    const err = error as {
      message?: string
      code?: number | string
      keyPattern?: Record<string, number>
      name?: string
    }

    if (
      err.message === 'Unauthorized' ||
      err.message?.includes('Forbidden')
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }

    if (err.message === 'User not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }

    if (err.message === 'Sender ID not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }

    if (err.code === 'ALREADY_ASSIGNED' || err.message?.includes('already assigned')) {
      return NextResponse.json({ error: 'Sender ID is already assigned to this user' }, { status: 400 })
    }

    if (err.code === 11000 && err.keyPattern?.userId && err.keyPattern?.isDefault) {
      return NextResponse.json(
        {
          error: 'User already has a default sender ID',
          details: 'Please unset the current default before setting a new one',
        },
        { status: 400 }
      )
    }

    if (err.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation error', details: err.message }, { status: 400 })
    }

    console.error('Assign sender ID error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

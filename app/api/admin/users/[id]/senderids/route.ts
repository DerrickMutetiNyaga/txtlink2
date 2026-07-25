/**
 * Admin: Manage User Sender IDs
 * POST /api/admin/users/[id]/senderids - Assign sender ID
 * DELETE /api/admin/users/[id]/senderids/[senderId] - Remove sender ID
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { UserSenderId } from '@/lib/db/models'
import { requireAdmin } from '@/lib/auth/middleware'
import { assignSenderIdToUser } from '@/lib/services/senderids/assign-to-user'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    requireAdmin(request)

    const { senderName, senderId, status, makeDefault } = await request.json()
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    if (!senderName && !senderId) {
      return NextResponse.json(
        { error: 'Either senderName or senderId is required' },
        { status: 400 }
      )
    }

    const result = await assignSenderIdToUser({
      userId,
      senderId,
      senderName,
      makeDefault,
    })

    return NextResponse.json({
      success: true,
      senderId: {
        id: result.senderId,
        senderName: result.senderName,
        status: result.status,
        isDefault: result.isDefault,
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number | string }

    if (err.message === 'Unauthorized' || err.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: err.message },
        { status: err.message?.includes('Forbidden') ? 403 : 401 }
      )
    }

    if (err.message === 'User not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }

    if (err.code === 'ALREADY_ASSIGNED') {
      return NextResponse.json({ error: 'Sender ID already linked to this user' }, { status: 400 })
    }

    console.error('Assign sender ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; senderId: string }> | { id: string; senderId: string } }
) {
  try {
    await connectDB()
    requireAdmin(request)

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const senderId = resolvedParams.senderId

    const userObjectId = new mongoose.Types.ObjectId(userId)
    const senderObjectId = new mongoose.Types.ObjectId(senderId)

    const result = await UserSenderId.findOneAndDelete({
      userId: userObjectId,
      senderId: senderObjectId,
    })

    if (!result) {
      return NextResponse.json({ error: 'Sender ID link not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { message?: string }
    if (err.message === 'Unauthorized' || err.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: err.message },
        { status: err.message?.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Remove sender ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

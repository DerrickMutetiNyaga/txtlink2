/**
 * Admin: Set Default Sender ID
 * POST /api/admin/users/[id]/senderids/[senderId]/default
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { UserSenderId } from '@/lib/db/models'
import { requireAdmin } from '@/lib/auth/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; senderId: string }> | { id: string; senderId: string } }
) {
  try {
    await connectDB()
    requireAdmin(request)

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const senderId = resolvedParams.senderId

    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const senderObjectId = new mongoose.Types.ObjectId(senderId)

    // Remove default from all sender IDs for this user
    await UserSenderId.updateMany(
      { userId: userObjectId },
      { $set: { isDefault: false } }
    )

    // Set this one as default
    const result = await UserSenderId.findOneAndUpdate(
      { userId: userObjectId, senderId: senderObjectId },
      { $set: { isDefault: true } },
      { new: true }
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Sender ID link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 401 })
    }
    console.error('Set default sender ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


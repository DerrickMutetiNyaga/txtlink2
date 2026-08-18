/**
 * Super Admin: remove another super admin
 * DELETE /api/super-admin/super-admins/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { isEnvOwner } from '@/lib/auth/owner'
import { logAudit } from '@/lib/utils/audit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    const actor = await requireOwner(request)
    const { id: userId } = await Promise.resolve(params)

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'A valid user id is required' }, { status: 400 })
    }

    if (userId === actor.userId) {
      return NextResponse.json({ error: 'You cannot remove your own super admin access' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (isEnvOwner(user.email, user._id.toString())) {
      return NextResponse.json(
        { error: 'The root owner cannot be removed as a super admin' },
        { status: 400 }
      )
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: 'This user is not a super admin' }, { status: 400 })
    }

    user.isSuperAdmin = false
    await user.save()

    await logAudit('REMOVE_SUPER_ADMIN', 'user', actor.userId, actor.email, {
      resourceId: userId,
      changes: { isSuperAdmin: { before: true, after: false }, email: user.email },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Remove super admin error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Super Admin: Manage Account
 * PATCH /api/super-admin/accounts/[id] - Update account
 * POST /api/super-admin/accounts/[id]/credits - Add/remove credits
 * POST /api/super-admin/accounts/[id]/suspend - Suspend/unsuspend
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    const { name, email, phone, isActive } = await request.json()
    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(userId)

    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const changes: Record<string, any> = {}
    if (name !== undefined && name !== user.name) changes.name = { from: user.name, to: name }
    if (email !== undefined && email !== user.email) changes.email = { from: user.email, to: email }
    if (phone !== undefined && phone !== user.phone) changes.phone = { from: user.phone, to: phone }
    if (isActive !== undefined && isActive !== user.isActive) changes.isActive = { from: user.isActive, to: isActive }

    await User.findByIdAndUpdate(userObjectId, {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(isActive !== undefined && { isActive }),
    })

    await logAudit('UPDATE_ACCOUNT', 'user', owner.userId, owner.email, {
      resourceId: userId,
      changes,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Update account error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    const { action, amount, reason } = await request.json()
    const mongoose = require('mongoose')
    const userObjectId = new mongoose.Types.ObjectId(userId)

    const user = await User.findById(userObjectId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (action === 'add_credits' || action === 'remove_credits') {
      const creditChange = action === 'add_credits' ? amount : -amount
      const updatedUser = await User.findByIdAndUpdate(
        userObjectId,
        { $inc: { credits: creditChange } },
        { new: true }
      )

      await logAudit(
        action === 'add_credits' ? 'ADD_CREDITS' : 'REMOVE_CREDITS',
        'user',
        owner.userId,
        owner.email,
        {
          resourceId: userId,
          changes: {
            amount: creditChange,
            previousBalance: user.credits,
            newBalance: updatedUser?.credits,
            reason,
          },
          request,
        }
      )

      return NextResponse.json({
        success: true,
        newBalance: updatedUser?.credits,
      })
    }

    if (action === 'suspend' || action === 'unsuspend') {
      const isActive = action === 'unsuspend'
      await User.findByIdAndUpdate(userObjectId, { isActive })

      await logAudit(
        action === 'suspend' ? 'SUSPEND_ACCOUNT' : 'UNSUSPEND_ACCOUNT',
        'user',
        owner.userId,
        owner.email,
        {
          resourceId: userId,
          changes: { isActive: { from: user.isActive, to: isActive } },
          request,
        }
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Account action error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


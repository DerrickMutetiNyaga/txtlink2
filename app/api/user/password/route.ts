/**
 * Update User Password
 * PATCH /api/user/password
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const body = await request.json()

    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const userDoc = await User.findById(userId)

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, userDoc.passwordHash)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    userDoc.passwordHash = hashedPassword
    await userDoc.save()

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update password error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


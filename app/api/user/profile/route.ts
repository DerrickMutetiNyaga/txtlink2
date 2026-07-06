/**
 * Get and Update User Profile
 * GET /api/user/profile - Get user profile
 * PATCH /api/user/profile - Update user profile
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const userDoc = await User.findById(userId).select('-passwordHash')

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone || '',
        role: userDoc.role,
        isActive: userDoc.isActive,
        createdAt: userDoc.createdAt,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const body = await request.json()

    // Allowed fields to update
    const allowedFields: Record<string, any> = {}
    if (body.name !== undefined) allowedFields.name = body.name
    if (body.phone !== undefined) allowedFields.phone = body.phone

    // Email cannot be changed through this endpoint (would need separate verification)
    // Password changes should go through a separate endpoint

    const userDoc = await User.findByIdAndUpdate(
      userId,
      { $set: allowedFields },
      { new: true, runValidators: true }
    ).select('-passwordHash')

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone || '',
        role: userDoc.role,
        isActive: userDoc.isActive,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


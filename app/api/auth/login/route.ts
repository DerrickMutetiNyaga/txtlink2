/**
 * User Login API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is owner
    const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim()
    const OWNER_USER_ID = process.env.OWNER_USER_ID?.trim()
    const userEmailLower = user.email.toLowerCase().trim()
    const ownerEmailLower = OWNER_EMAIL?.toLowerCase().trim()
    
    const isOwner =
      (ownerEmailLower && userEmailLower === ownerEmailLower) ||
      (OWNER_USER_ID && user._id.toString() === OWNER_USER_ID)
    
    // Debug logging
    console.log('Owner check:', {
      userEmail: user.email,
      userEmailLower,
      OWNER_EMAIL,
      ownerEmailLower,
      OWNER_USER_ID,
      userId: user._id.toString(),
      isOwner
    })

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        isOwner, // Include owner status - CRITICAL for redirect logic
      },
      token,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


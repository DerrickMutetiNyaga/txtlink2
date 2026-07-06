/**
 * Get and Create User API Keys
 * GET /api/user/api-keys - Get user's API keys
 * POST /api/user/api-keys - Create new API key
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { ApiKey, UserSenderId } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { encrypt } from '@/lib/utils/encryption'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const apiKeys = await ApiKey.find({ userId, status: 'active' })
      .sort({ createdAt: -1 })
      .lean()

    // Check if user has any sender IDs
    const senderIdCount = await UserSenderId.countDocuments({ userId })

    const formattedKeys = apiKeys.map((key) => ({
      id: key._id?.toString(),
      name: key.name,
      keyPrefix: key.keyPrefix,
      type: key.type,
      status: key.status,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      canReveal: Boolean(key.keyEncrypted),
    }))

    return NextResponse.json({
      success: true,
      apiKeys: formattedKeys,
      hasSenderIds: senderIdCount > 0,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get API keys error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const userId = new mongoose.Types.ObjectId(user.userId)
    const body = await request.json()

    const { name, type } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    if (!['live', 'test'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "live" or "test"' },
        { status: 400 }
      )
    }

    // Check if user has at least one sender ID
    const senderIdCount = await UserSenderId.countDocuments({ userId })
    if (senderIdCount === 0) {
      return NextResponse.json(
        { error: 'You must have at least one approved sender ID before generating an API key. Please request a sender ID first.' },
        { status: 400 }
      )
    }

    // Generate API key
    const randomBytes = crypto.randomBytes(32).toString('hex')
    const keyPrefix = type === 'live' ? 'sk_live_' : 'sk_test_'
    const fullKey = `${keyPrefix}${randomBytes}`

    // Hash the key (we never store the plain key)
    const keyHash = await bcrypt.hash(fullKey, 10)

    // Create API key record
    const apiKey = await ApiKey.create({
      userId,
      name,
      keyHash,
      keyEncrypted: encrypt(fullKey),
      keyPrefix: `${keyPrefix}${randomBytes.substring(0, 8)}`,
      type,
      status: 'active',
    })

    // Return the full key only once (for display to user)
    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey._id?.toString(),
        name: apiKey.name,
        key: fullKey, // Only returned on creation
        type: apiKey.type,
        createdAt: apiKey.createdAt,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create API key error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


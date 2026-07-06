/**
 * Request Sender ID API
 * POST /api/senderids/request
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderId, UserSenderId, HostPinnacleAccount } from '@/lib/db/models'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { requireAuth } from '@/lib/auth/middleware'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)

    const { senderName } = await request.json()

    if (!senderName || typeof senderName !== 'string' || senderName.length === 0) {
      return NextResponse.json({ error: 'senderName is required' }, { status: 400 })
    }

    // Validate sender name format (alphanumeric, max 11 chars typically)
    if (!/^[A-Z0-9]{1,11}$/.test(senderName)) {
      return NextResponse.json(
        { error: 'Sender ID must be alphanumeric, uppercase, max 11 characters' },
        { status: 400 }
      )
    }

    // Check if sender ID already exists
    const existing = await SenderId.findOne({ senderName })
    if (existing) {
      return NextResponse.json({ error: 'Sender ID already exists' }, { status: 400 })
    }

    // Get user's HostPinnacle account
    const hpAccount = await HostPinnacleAccount.findOne({ userId: user.userId })
    if (!hpAccount) {
      return NextResponse.json(
        { error: 'HostPinnacle account not found. Please contact admin.' },
        { status: 404 }
      )
    }

    // Get credentials
    const apiKey = hpAccount.hpApiKeyEncrypted
      ? decrypt(hpAccount.hpApiKeyEncrypted)
      : undefined
    const password = hpAccount.hpPasswordEncrypted
      ? decrypt(hpAccount.hpPasswordEncrypted)
      : undefined

    if (!apiKey && !password) {
      return NextResponse.json(
        { error: 'HostPinnacle credentials not configured' },
        { status: 500 }
      )
    }

    // Create sender ID in HostPinnacle
    const hpResult = await hostPinnacleClient.createSenderId({
      senderId: senderName,
      options: {
        apiKey,
        userId: hpAccount.hpUserLoginName,
        password,
      },
    })

    if (!hpResult.success) {
      return NextResponse.json(
        { error: 'Failed to create sender ID in HostPinnacle', details: hpResult.error },
        { status: 500 }
      )
    }

    // Create sender ID in our DB
    const senderId = await SenderId.create({
      senderName,
      provider: 'hostpinnacle',
      status: 'pending', // Will be updated when approved
      hpSenderId: hpResult.data?.senderId || hpResult.data?.id,
    })

    // Link to user
    await UserSenderId.create({
      userId: user.userId,
      senderId: senderId._id,
      isDefault: false,
    })

    return NextResponse.json({
      success: true,
      senderId: {
        id: senderId._id,
        senderName: senderId.senderName,
        status: senderId.status,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Sender ID request error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


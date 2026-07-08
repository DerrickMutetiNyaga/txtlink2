import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import {
  generateGatewayToken,
  hashGatewayToken,
  clearGatewayTokenActivationFields,
} from '@/lib/services/sms-gateway/auth'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json().catch(() => ({}))
    const replaceOldToken = body.replaceOldToken !== false

    const existing = await SmsGatewayDevice.findOne({ userId })

    if (existing && !replaceOldToken) {
      return NextResponse.json(
        {
          error:
            'An active token already exists. Generate with replaceOldToken to replace it.',
        },
        { status: 400 }
      )
    }

    const plainToken = generateGatewayToken()
    const tokenHash = hashGatewayToken(plainToken)

    if (existing) {
      existing.tokenHash = tokenHash
      existing.isActive = true
      clearGatewayTokenActivationFields(existing)
      await existing.save()
    } else {
      await SmsGatewayDevice.create({
        userId,
        tokenHash,
        label: 'Phone Gateway',
        simLabel: '',
        isActive: true,
      })
    }

    return NextResponse.json({
      success: true,
      token: plainToken,
      replacedPreviousToken: Boolean(existing),
      message: existing
        ? 'New device token generated and previous token replaced. Copy it now — it will not be shown again.'
        : 'Device token generated. Copy it now — it will not be shown again.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Generate SMS gateway token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

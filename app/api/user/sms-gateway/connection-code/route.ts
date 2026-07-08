import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import {
  generateGatewayToken,
  hashGatewayToken,
  clearGatewayTokenActivationFields,
} from '@/lib/services/sms-gateway/auth'
import {
  buildGatewaySetupPayload,
  encodeConnectionCode,
  resolveGatewayApiBaseUrl,
} from '@/lib/services/sms-gateway/connection-code'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json().catch(() => ({}))
    const replaceOldToken = body.replaceOldToken !== false

    const existing = await SmsGatewayDevice.findOne({ userId })

    if (existing?.isActive && !replaceOldToken) {
      return NextResponse.json(
        {
          error:
            'An active token already exists. Enable "Replace old active token" to generate a new connection code.',
        },
        { status: 400 }
      )
    }

    const plainToken = generateGatewayToken()
    const tokenHash = hashGatewayToken(plainToken)
    const apiBaseUrl = resolveGatewayApiBaseUrl(request.nextUrl.origin)

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

    const payload = buildGatewaySetupPayload(apiBaseUrl, plainToken)
    const connectionCode = encodeConnectionCode(payload)

    return NextResponse.json({
      success: true,
      connectionCode,
      message: 'Connection code generated. Copy it now.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Generate SMS gateway connection code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

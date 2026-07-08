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
  INVALID_PUBLIC_ORIGIN_MESSAGE,
  resolveGatewayApiBaseUrl,
  resolvePublicOriginFromRequest,
} from '@/lib/services/sms-gateway/connection-code'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json().catch(() => ({}))
    const replaceOldToken =
      body.replaceOldActiveToken !== false && body.replaceOldToken !== false

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

    const publicOrigin = resolvePublicOriginFromRequest(request, body.publicOrigin)
    const apiBaseUrl = resolveGatewayApiBaseUrl(publicOrigin)

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

    const payload = buildGatewaySetupPayload(apiBaseUrl, plainToken)
    const connectionCode = encodeConnectionCode(payload)

    return NextResponse.json({
      success: true,
      connectionCode,
      apiBaseUrl,
      message: 'Connection code generated. Copy it now.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === INVALID_PUBLIC_ORIGIN_MESSAGE) {
      return NextResponse.json({ error: INVALID_PUBLIC_ORIGIN_MESSAGE }, { status: 400 })
    }
    console.error('Generate SMS gateway connection code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import {
  generateGatewayToken,
  hashGatewayToken,
} from '@/lib/services/sms-gateway/auth'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const plainToken = generateGatewayToken()
    const tokenHash = hashGatewayToken(plainToken)

    const existing = await SmsGatewayDevice.findOne({ userId })

    if (existing) {
      existing.tokenHash = tokenHash
      existing.isActive = true
      existing.boundDeviceFingerprint = undefined
      existing.boundDeviceName = undefined
      existing.boundSimLabel = undefined
      existing.lastHeartbeatAt = undefined
      existing.lastSyncAt = undefined
      existing.lastIp = undefined
      existing.lastUserAgent = undefined
      existing.appVersion = undefined
      existing.batteryLevel = undefined
      existing.isSmsPermissionGranted = undefined
      existing.isGatewayRunning = undefined
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
      message: 'Device token generated. Copy it now — it will not be shown again.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Generate SMS gateway token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

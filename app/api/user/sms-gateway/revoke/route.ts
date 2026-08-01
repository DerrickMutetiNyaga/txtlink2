import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { clearGatewayTokenActivationFields } from '@/lib/services/sms-gateway/auth'
import { logGatewayAudit } from '@/lib/services/sms-gateway/audit'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const device = await SmsGatewayDevice.findOne({ userId })

    if (!device) {
      return NextResponse.json(
        { error: 'No gateway device token found.' },
        { status: 404 }
      )
    }

    // Invalidate immediately — hash stays so old token cannot authenticate
    const oldHashPrefix = device.tokenHash?.slice(0, 12)
    device.isActive = false
    clearGatewayTokenActivationFields(device)
    device.tokenHash = `revoked_${device.tokenHash}`
    device.serviceState = 'STOPPED_BY_USER'
    await device.save()

    await logGatewayAudit(user.userId, 'GATEWAY_TOKEN_REVOKED', String(device._id), {
      tokenHashPrefix: oldHashPrefix,
    })

    return NextResponse.json({
      success: true,
      message:
        'Device token revoked and invalidated immediately. Generate a new connection code to reconnect.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Revoke SMS gateway token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

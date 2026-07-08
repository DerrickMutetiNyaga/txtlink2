import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const device = await SmsGatewayDevice.findOne({ userId })

    if (!device) {
      return NextResponse.json(
        { error: 'No gateway device token found. Generate a token first.' },
        { status: 404 }
      )
    }

    device.boundDeviceFingerprint = undefined
    device.boundDeviceName = undefined
    device.boundSimLabel = undefined
    device.lastHeartbeatAt = undefined
    device.lastSyncAt = undefined
    device.lastIp = undefined
    device.lastUserAgent = undefined
    device.appVersion = undefined
    device.batteryLevel = undefined
    device.isSmsPermissionGranted = undefined
    device.isGatewayRunning = undefined
    await device.save()

    return NextResponse.json({
      success: true,
      message: 'Device binding reset. You can now connect this token on a different phone.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Reset SMS gateway binding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

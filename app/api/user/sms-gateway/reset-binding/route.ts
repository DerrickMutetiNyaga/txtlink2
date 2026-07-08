import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { clearGatewayBindingFields } from '@/lib/services/sms-gateway/auth'
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

    clearGatewayBindingFields(device)
    await device.save()

    return NextResponse.json({
      success: true,
      message:
        'Device binding and gateway pause cleared. The token can reconnect on the next app sync.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Reset SMS gateway binding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { normalizeKenyanPhone } from '@/lib/utils/phone'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const body = await request.json()
    const { phone, message } = body

    if (!phone || !message?.trim()) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    const normalized = normalizeKenyanPhone(phone)
    if (!normalized) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use a Kenyan number like 0712345678 or 254712345678.' },
        { status: 400 }
      )
    }

    const testSmsId = `test_${new mongoose.Types.ObjectId()}`

    const job = await SmsFallbackJob.create({
      userId,
      originalSmsId: testSmsId,
      recipientPhone: phone,
      normalizedPhone: normalized,
      message: message.trim(),
      originalStatus: 'test',
      status: 'pending',
      retryAttempted: false,
      attempts: 0,
      isTest: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Test phone gateway job created. Fetch it from the Android app via /jobs/pending.',
      job: {
        id: String(job._id),
        recipientPhone: normalized,
        message: job.message,
        status: 'pending',
        isTest: true,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create test gateway job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

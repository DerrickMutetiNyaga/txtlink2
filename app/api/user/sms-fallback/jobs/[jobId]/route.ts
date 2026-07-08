import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

type RouteContext = { params: Promise<{ jobId: string }> }

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const { jobId } = await context.params
    const userId = new mongoose.Types.ObjectId(user.userId)

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    const job = await SmsFallbackJob.findOne({ _id: jobId, userId })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.isTest && job.originalSmsId) {
      const sms = await SmsMessage.findById(job.originalSmsId)
      if (
        sms &&
        sms.fallbackStatus !== 'sent_via_phone' &&
        sms.status !== 'delivered' &&
        String(sms.fallbackJobId) === jobId
      ) {
        await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
          fallbackStatus: 'cancelled',
          fallbackQueued: false,
          fallbackJobId: null,
        })
      }
    }

    await SmsFallbackJob.deleteOne({ _id: jobId, userId })

    return NextResponse.json({ success: true, message: 'Phone fallback job deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete fallback job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

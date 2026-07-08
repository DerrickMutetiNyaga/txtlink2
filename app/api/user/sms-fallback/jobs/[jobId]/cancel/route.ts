import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

type RouteContext = { params: Promise<{ jobId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
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

    if (job.status === 'cancelled') {
      return NextResponse.json({ success: true, message: 'Job already cancelled' })
    }

    if (job.status === 'sent' && !job.isTest) {
      return NextResponse.json(
        { error: 'Cannot cancel — SMS was already delivered via phone' },
        { status: 400 }
      )
    }

    job.status = 'cancelled'
    job.cancelReason = 'Cancelled by user'
    await job.save()

    if (!job.isTest && job.originalSmsId) {
      const sms = await SmsMessage.findById(job.originalSmsId)
      if (sms && sms.fallbackStatus !== 'sent_via_phone' && sms.status !== 'delivered') {
        await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
          fallbackStatus: 'cancelled',
          fallbackQueued: false,
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Phone fallback job cancelled' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Cancel fallback job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

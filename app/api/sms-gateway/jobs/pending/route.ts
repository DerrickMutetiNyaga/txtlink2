import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, ISmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { cancelFallbackJobIfDelivered } from '@/lib/services/sms-fallback/helpers'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { isPhoneDeliveredFallbackStatus } from '@/lib/services/sms-fallback/phone-status'
import {
  resolveFallbackMessageForSms,
  buildMetadataFromSms,
  isMetadataUsedAsMessageBody,
} from '@/lib/services/sms/message-body'

const ROUTE = 'GET /api/sms-gateway/jobs/pending'

async function finalizeDeliveredJob(jobId: unknown, deliveredAt: Date): Promise<void> {
  await SmsFallbackJob.findByIdAndUpdate(jobId, {
    status: 'delivered',
    phoneStatus: 'delivered',
    deliveredAt,
    sentAt: deliveredAt,
  })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateGatewayDevice(request, { route: ROUTE })
    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    await connectDB()

    if (auth.device.requiresTopUp) {
      return NextResponse.json({
        success: true,
        jobs: [],
        gatewayPaused: true,
        requiresTopUp: true,
        message: 'Phone gateway paused — reload SMS bundle or airtime on the device',
      })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10) || 5, 50)
    const userId = auth.device.userId

    await SmsFallbackJob.updateMany(
      { userId, status: 'notified' },
      { $set: { status: 'pending', phoneStatus: 'pending' } }
    )

    await SmsFallbackJob.updateMany(
      { userId, status: 'sent' },
      [
        {
          $set: {
            status: 'delivered',
            phoneStatus: 'delivered',
            deliveredAt: { $ifNull: ['$deliveredAt', '$sentAt'] },
          },
        },
      ]
    )

    const jobs = await SmsFallbackJob.find({ userId, status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()

    const activeJobs = []
    for (const job of jobs) {
      if (job.status !== 'pending') continue
      if (job.phoneStatus === 'delivered') continue
      if (job.deliveredAt || job.sentAt) {
        await finalizeDeliveredJob(job._id, job.deliveredAt || job.sentAt || new Date())
        continue
      }

      let jobMessage = job.message
      let smsForBody: ISmsMessage | null = null

      if (!job.isTest) {
        const cancelled = await cancelFallbackJobIfDelivered(
          job.originalSmsId,
          'Original SMS delivered before phone fallback'
        )
        if (cancelled) continue

        const sms = await SmsMessage.findById(job.originalSmsId).lean()
        if (!sms) {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            status: 'cancelled',
            phoneStatus: 'cancelled',
            cancelReason: 'Original SMS not found',
          })
          continue
        }
        smsForBody = sms as ISmsMessage

        if (
          sms.status === 'delivered' ||
          sms.deliveryStatus === 'delivered' ||
          isPhoneDeliveredFallbackStatus(sms.fallbackStatus) ||
          sms.deliveryMethod === 'android_phone_gateway'
        ) {
          await SmsFallbackJob.findByIdAndUpdate(job._id, {
            status: 'cancelled',
            phoneStatus: 'cancelled',
            cancelReason: 'Original SMS delivered before phone fallback',
          })
          continue
        }
      }

      if (smsForBody) {
        const resolved = resolveFallbackMessageForSms(smsForBody)
        if (resolved) {
          jobMessage = resolved.body
          if (job.message !== resolved.body) {
            await SmsFallbackJob.findByIdAndUpdate(job._id, { message: resolved.body })
          }
        } else if (isMetadataUsedAsMessageBody(job.message, buildMetadataFromSms(smsForBody))) {
          console.error('Pending job has invalid message body — skipping', {
            jobId: String(job._id),
            originalSmsId: job.originalSmsId,
          })
          continue
        }
      }

      if (!jobMessage?.trim()) continue

      activeJobs.push({
        id: String(job._id),
        recipientPhone: job.normalizedPhone || job.recipientPhone,
        message: jobMessage,
        status: 'pending',
        isTest: Boolean(job.isTest),
        createdAt: job.createdAt,
        attempts: job.attempts || 0,
      })
    }

    auth.device.lastSyncAt = new Date()
    await auth.device.save()

    return NextResponse.json({ success: true, jobs: activeJobs })
  } catch (error: any) {
    console.error('SMS gateway pending jobs error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

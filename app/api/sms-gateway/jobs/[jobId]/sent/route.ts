import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logAuditAction } from '@/lib/utils/audit'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'
import {
  beginGatewayStatusEvent,
  completeGatewayStatusEvent,
} from '@/lib/services/sms-gateway/idempotency'
import {
  canTransitionPhoneJobStatus,
  canTransitionPhoneSmsStatus,
  mapAndroidEventToSmsFallbackStatus,
} from '@/lib/services/sms-gateway/phone-status-transitions'
import { logGatewayAudit } from '@/lib/services/sms-gateway/audit'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/sent'

export async function POST(request: NextRequest, context: RouteContext) {
  const { jobId: rawJobId } = await context.params
  const jobId = parseGatewayJobId(rawJobId)

  try {
    const body = await request.json().catch(() => ({}))
    const deviceName = body.deviceName || ''
    const simLabel = body.simLabel || ''

    const auth = await validateGatewayDevice(request, {
      route: ROUTE,
      body: { deviceName, simLabel, deviceId: body.deviceId },
    })
    if (!auth.ok) {
      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName,
        responseCode: auth.status,
        message: auth.message,
        extra: { code: auth.code },
      })
      return gatewayAuthErrorResponse(auth)
    }

    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Invalid job ID' }, { status: 400 })
    }

    await connectDB()

    const idempotency = await beginGatewayStatusEvent({
      userId: auth.device.userId,
      jobId: rawJobId,
      eventId: body.eventId,
      idempotencyKey: body.idempotencyKey,
      attemptId: body.attemptId,
      eventType: body.eventType || 'sent',
      eventTimestamp: body.eventTimestamp || body.sentAt,
      partIndex: body.partIndex,
      totalParts: body.totalParts,
      payloadSummary: {
        eventType: body.eventType || 'sent',
        delivered: body.delivered === true,
        ambiguous: body.ambiguous === true,
      },
    })

    if (idempotency.duplicate) {
      await logGatewayAudit(String(auth.device.userId), 'GATEWAY_STATUS_DUPLICATE', rawJobId, {
        eventType: body.eventType || 'sent',
      })
      return NextResponse.json(idempotency.previousResponse)
    }

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    })
      .select('status phoneStatus isTest originalSmsId')
      .lean()

    const statusBefore = existing?.status ?? null

    if (existing?.status === 'delivered') {
      const response = {
        success: true,
        message: 'SMS already delivered via phone gateway',
        jobStatus: 'delivered',
        smsFallbackStatus: 'delivered_via_phone',
      }
      await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
      return NextResponse.json(response)
    }

    const ambiguous =
      body.ambiguous === true ||
      body.eventType === 'ambiguous' ||
      body.eventType === 'unknown' ||
      body.resultCode === 0 ||
      body.resultCode === '0'

    const deliveredExplicit =
      body.delivered === true || body.eventType === 'delivered' || body.deliveryConfirmed === true

    // Legacy Android: /sent means phone send succeeded. Prefer sent_via_phone unless
    // delivery is explicitly confirmed. Keep backward compat: default delivered when
    // no eventType provided (old app treated sent as delivered).
    const legacySentMeansDelivered = !body.eventType && body.delivered !== false && !ambiguous

    const targetSmsStatus = mapAndroidEventToSmsFallbackStatus({
      eventType: body.eventType,
      delivered: deliveredExplicit || legacySentMeansDelivered,
      sent: true,
      ambiguous,
      failed: false,
    })

    const targetJobStatus =
      targetSmsStatus === 'delivered_via_phone'
        ? 'delivered'
        : targetSmsStatus === 'submission_unknown'
          ? 'sent'
          : 'sent'

    const jobTransition = canTransitionPhoneJobStatus(existing?.status, targetJobStatus)
    if (!jobTransition.ok && statusBefore === 'delivered') {
      const response = {
        success: true,
        message: 'Ignoring stale status — already delivered',
        jobStatus: 'delivered',
        rejected: true,
        reason: jobTransition.reason,
      }
      await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
      await logGatewayAudit(String(auth.device.userId), 'GATEWAY_STATUS_REJECTED', rawJobId, {
        reason: jobTransition.reason,
      })
      return NextResponse.json(response)
    }

    const eventAt = body.sentAt ? new Date(body.sentAt) : new Date()

    const jobSet: Record<string, unknown> = {
      status: targetJobStatus,
      phoneStatus:
        targetSmsStatus === 'delivered_via_phone'
          ? 'delivered'
          : targetSmsStatus === 'submission_unknown'
            ? 'sent'
            : 'sent',
      sentAt: eventAt,
      deviceName: deviceName || auth.device.boundDeviceName,
      simLabel: simLabel || auth.device.boundSimLabel,
      localMessageId: body.localMessageId,
    }
    if (targetSmsStatus === 'delivered_via_phone') {
      jobSet.deliveredAt = eventAt
    }

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: { $in: ['sending', 'pending', 'sent', 'failed'] },
      },
      {
        $set: jobSet,
        $unset: { resetReason: 1, failureReason: 1, failureCode: 1, failedAt: 1 },
      },
      { new: true }
    )

    if (!job) {
      // Already terminal elsewhere
      const again = await SmsFallbackJob.findOne({ _id: jobId, userId: auth.device.userId })
        .select('status')
        .lean()
      if (again?.status === 'delivered' || again?.status === 'sent') {
        const response = {
          success: true,
          message: 'SMS status already recorded',
          jobStatus: again.status,
        }
        await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
        return NextResponse.json(response)
      }

      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore,
        statusAfter: statusBefore,
        responseCode: 409,
        message: 'Job not found or already processed',
      })
      return NextResponse.json(
        { success: false, message: 'Job not found or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      const sms = await SmsMessage.findById(job.originalSmsId)
        .select('fallbackStatus status')
        .lean()
      const smsTransition = canTransitionPhoneSmsStatus(sms?.fallbackStatus, targetSmsStatus)

      if (smsTransition.apply || !sms?.fallbackStatus) {
        const smsUpdate: Record<string, unknown> = {
          deliveryMethod: 'android_phone_gateway',
          fallbackStatus: targetSmsStatus,
          fallbackSentAt: eventAt,
          fallbackProvider: 'android_phone_gateway',
          fallbackJobId: rawJobId,
          requiresPhoneTopUp: false,
          nextCheckAt: null,
        }

        if (targetSmsStatus === 'delivered_via_phone') {
          smsUpdate.status = 'delivered'
          smsUpdate.deliveryStatus = 'delivered'
          smsUpdate.deliveredAt = eventAt
          smsUpdate.fallbackDeliveredAt = eventAt
          smsUpdate.finalizedAt = eventAt
          smsUpdate.fallbackFailedAt = null
          smsUpdate.fallbackFailureReason = null
          smsUpdate.fallbackFailureCode = null
        } else if (targetSmsStatus === 'sent_via_phone') {
          // Sent via phone, delivery unconfirmed — do NOT stay on queued_for_phone
          smsUpdate.status = sms?.status === 'delivered' ? 'delivered' : 'sent'
          smsUpdate.deliveryStatus = 'sent'
        } else if (targetSmsStatus === 'submission_unknown') {
          smsUpdate.status = sms?.status === 'delivered' ? 'delivered' : 'sent'
          smsUpdate.deliveryStatus = 'sent'
          smsUpdate.fallbackFailureReason = 'Submission result unknown — not confirmed failed'
        }

        await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
          $set: smsUpdate,
          $unset:
            targetSmsStatus === 'delivered_via_phone'
              ? {
                  fallbackFailedAt: 1,
                  fallbackFailureReason: 1,
                  fallbackFailureCode: 1,
                  failedAt: 1,
                }
              : {},
        })

        await logAuditAction(
          String(auth.device.userId),
          targetSmsStatus === 'delivered_via_phone'
            ? 'PHONE_GATEWAY_SMS_DELIVERED'
            : 'PHONE_GATEWAY_SMS_SENT',
          'SmsMessage',
          job.originalSmsId,
          {
            jobId: rawJobId,
            deviceName: job.deviceName,
            simLabel: job.simLabel,
            localMessageId: job.localMessageId,
            fallbackStatus: targetSmsStatus,
          }
        )
      } else {
        await logGatewayAudit(String(auth.device.userId), 'GATEWAY_STATUS_REJECTED', rawJobId, {
          reason: smsTransition.reason,
          current: sms?.fallbackStatus,
          next: targetSmsStatus,
        })
      }
    }

    // Successful phone send clears transient errors; never pauses gateway
    auth.device.requiresTopUp = false
    auth.device.topUpAlertDismissed = false
    auth.device.isGatewayRunning =
      body.isGatewayRunning === false ? false : true
    auth.device.consecutiveTransientFailures = 0
    auth.device.lastTransientError = undefined
    auth.device.lastSuccessfulStatusAt = eventAt
    auth.device.lastPhoneSendAt = eventAt
    auth.device.serviceState = auth.device.isGatewayRunning ? 'RUNNING' : 'STOPPED_BY_USER'
    auth.device.syncHealth = 'UP_TO_DATE'
    // Do not clear a confirmed SIM top-up pause from a successful send on another SIM
    if (auth.device.pauseScope !== 'SIM') {
      auth.device.pausedAt = undefined
      auth.device.pauseReason = undefined
      auth.device.pauseScope = undefined
    }
    await auth.device.save()

    const response = {
      success: true,
      message:
        targetSmsStatus === 'delivered_via_phone'
          ? 'SMS marked delivered via phone gateway'
          : targetSmsStatus === 'submission_unknown'
            ? 'Submission result unknown — recorded without marking failed'
            : 'SMS marked sent via phone gateway (delivery unconfirmed)',
      jobStatus: targetJobStatus,
      smsFallbackStatus: targetSmsStatus,
    }

    await completeGatewayStatusEvent(auth.device.userId, idempotency.key, response)
    await logGatewayAudit(
      String(auth.device.userId),
      targetSmsStatus === 'delivered_via_phone' ? 'GATEWAY_JOB_DELIVERED' : 'GATEWAY_JOB_SENT',
      rawJobId,
      { smsFallbackStatus: targetSmsStatus }
    )

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sending',
      statusAfter: targetJobStatus,
      responseCode: 200,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('SMS gateway job sent error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage, SmsGatewayDevice } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logAuditAction } from '@/lib/utils/audit'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'
import {
  buildDeliveredJobUpdate,
  isValidSmsMessageId,
  logPhoneStatusEvent,
  maskGatewayJobId,
  parseGatewayStatusBody,
  phoneStatusErrorReason,
  precheckPhoneDeliveredStatus,
} from '@/lib/services/sms-gateway/phone-status-routes'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/delivered'

/**
 * Genuine SMS delivery callback → DELIVERED_VIA_PHONE.
 * Distinct from /sent (modem submission success).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { jobId: rawJobId } = await context.params
  const jobId = parseGatewayJobId(rawJobId)
  const startedAt = nowMs()
  let deviceId: unknown = null
  let gatewayDeviceIdHeader: string | null = request.headers.get('x-gateway-device-id')

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = parseGatewayStatusBody(body, 'delivered')

    const auth = await validateGatewayDevice(request, {
      route: ROUTE,
      body: { deviceName: parsed.deviceName, simLabel: parsed.simLabel, deviceId: body.deviceId },
    })
    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    deviceId = auth.device._id
    const lockedBy = String(auth.device._id)
    gatewayDeviceIdHeader =
      (typeof body.deviceId === 'string' ? body.deviceId : null) ||
      auth.identity.deviceId ||
      gatewayDeviceIdHeader

    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Invalid job ID' }, { status: 400 })
    }

    logPhoneStatusEvent('PHONE_DELIVERED_STATUS_RECEIVED', {
      job: maskGatewayJobId(rawJobId),
      hasAttemptId: Boolean(parsed.attemptId),
      legacyMode: parsed.legacyMode,
    })

    await connectDB()

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    }).lean()

    const statusBefore = existing?.status ?? null
    const precheck = precheckPhoneDeliveredStatus(existing, parsed, lockedBy)

    if (!precheck.ok) {
      logPhoneStatusEvent('PHONE_STATUS_ROUTE_ERROR', {
        route: 'delivered',
        job: maskGatewayJobId(rawJobId),
        reason: precheck.code,
        canonicalStatus: precheck.canonicalStatus ?? statusBefore,
      })
      return NextResponse.json(
        {
          success: false,
          code: precheck.code,
          message: precheck.message,
          ...(precheck.canonicalStatus ? { canonicalStatus: precheck.canonicalStatus } : {}),
        },
        { status: precheck.httpStatus }
      )
    }

    if (precheck.duplicate) {
      await recordGatewayConnectionDiagnostic({
        deviceId,
        route: ROUTE,
        httpStatus: 200,
        durationMs: elapsedMs(startedAt),
        kind: 'status',
        gatewayDeviceIdHeader,
      })
      logPhoneStatusEvent('PHONE_DELIVERED_STATUS_ACK', {
        job: maskGatewayJobId(rawJobId),
        duplicate: true,
      })
      return NextResponse.json({
        success: true,
        message: 'SMS already marked delivered via phone gateway',
        jobStatus: 'delivered',
        canonicalStatus: 'DELIVERED_VIA_PHONE',
        duplicate: true,
        serverRevision: precheck.serverRevision,
      })
    }

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: { $in: precheck.eligibleStatuses },
      },
      buildDeliveredJobUpdate(existing!, parsed, auth.device, precheck.lateCallback),
      { new: true }
    )

    if (!job) {
      const again = await SmsFallbackJob.findOne({ _id: jobId, userId: auth.device.userId })
        .select('status serverRevision')
        .lean()
      if (again?.status === 'delivered') {
        logPhoneStatusEvent('PHONE_DELIVERED_STATUS_ACK', {
          job: maskGatewayJobId(rawJobId),
          duplicate: true,
        })
        return NextResponse.json({
          success: true,
          message: 'SMS marked delivered via phone gateway',
          jobStatus: 'delivered',
          canonicalStatus: 'DELIVERED_VIA_PHONE',
          duplicate: true,
          serverRevision: again.serverRevision ?? null,
        })
      }
      logPhoneStatusEvent('PHONE_STATUS_ROUTE_ERROR', {
        route: 'delivered',
        job: maskGatewayJobId(rawJobId),
        reason: 'CONFLICT',
        canonicalStatus: statusBefore,
      })
      return NextResponse.json(
        { success: false, code: 'CONFLICT', message: 'Job not found or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest && isValidSmsMessageId(job.originalSmsId)) {
      try {
        await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
          status: 'delivered',
          deliveryStatus: 'delivered',
          deliveredAt: parsed.eventAt,
          deliveryMethod: 'android_phone_gateway',
          fallbackStatus: 'delivered_via_phone',
          fallbackSentAt: job.phoneSentAt || job.sentAt || parsed.eventAt,
          fallbackDeliveredAt: parsed.eventAt,
          fallbackProvider: 'android_phone_gateway',
          fallbackJobId: rawJobId,
          fallbackFailedAt: null,
          fallbackFailureReason: null,
          fallbackFailureCode: null,
          requiresPhoneTopUp: false,
          finalizedAt: parsed.eventAt,
          nextCheckAt: null,
          failedAt: null,
          errorMessage: null,
          errorCode: null,
        })

        await logAuditAction(
          String(auth.device.userId),
          'PHONE_GATEWAY_SMS_DELIVERED',
          'SmsMessage',
          job.originalSmsId,
          {
            jobId: rawJobId,
            deviceName: job.deviceName,
            simLabel: job.simLabel,
            localMessageId: job.localMessageId,
          }
        )
      } catch (smsError) {
        // SmsFallbackJob is authoritative — projection failure must not become HTTP 500
        logPhoneStatusEvent('PHONE_STATUS_SMS_PROJECTION_ERROR', {
          route: 'delivered',
          job: maskGatewayJobId(rawJobId),
          reason: phoneStatusErrorReason(smsError),
        })
      }
    }

    await SmsGatewayDevice.updateOne(
      { _id: deviceId },
      {
        $set: {
          requiresTopUp: false,
          topUpAlertDismissed: false,
          isGatewayRunning: true,
        },
        $unset: { pausedAt: 1, pauseReason: 1 },
      }
    )

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'sent',
      statusAfter: 'delivered',
      responseCode: 200,
      extra: { lateCallback: precheck.lateCallback },
    })

    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 200,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    })

    logPhoneStatusEvent('PHONE_DELIVERED_STATUS_ACK', {
      job: maskGatewayJobId(rawJobId),
      duplicate: false,
      lateCallback: precheck.lateCallback,
    })

    return NextResponse.json({
      success: true,
      message: 'SMS marked delivered via phone gateway',
      jobStatus: 'delivered',
      canonicalStatus: 'DELIVERED_VIA_PHONE',
      serverRevision: job.serverRevision ?? null,
      lateCallback: precheck.lateCallback,
    })
  } catch (error: unknown) {
    const reason = phoneStatusErrorReason(error)
    console.error('SMS gateway job delivered error:', error)
    logPhoneStatusEvent('PHONE_STATUS_ROUTE_ERROR', {
      route: 'delivered',
      job: maskGatewayJobId(rawJobId),
      reason,
    })
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

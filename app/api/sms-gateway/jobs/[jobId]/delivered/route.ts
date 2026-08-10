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
  canTransitionCanonical,
  toCanonicalStatus,
} from '@/lib/services/sms-gateway/canonical-status'

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
    const deviceName = body.deviceName || ''
    const simLabel = body.simLabel || ''
    const claimToken = typeof body.claimToken === 'string' ? body.claimToken : null
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : null
    const legacyMode = !claimToken && !attemptId

    const auth = await validateGatewayDevice(request, {
      route: ROUTE,
      body: { deviceName, simLabel, deviceId: body.deviceId },
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

    await connectDB()

    const existing = await SmsFallbackJob.findOne({
      _id: jobId,
      userId: auth.device.userId,
    }).lean()

    const statusBefore = existing?.status ?? null
    const canonicalBefore = toCanonicalStatus(existing?.status, existing?.canonicalStatus)

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 })
    }

    // Idempotent DELIVERED
    if (existing.status === 'delivered' || canonicalBefore === 'DELIVERED_VIA_PHONE') {
      if (attemptId && existing.attemptId && existing.attemptId !== attemptId) {
        return NextResponse.json(
          {
            success: false,
            code: 'STALE_ATTEMPT',
            message: 'Stale attempt cannot overwrite DELIVERED',
          },
          { status: 409 }
        )
      }
      await recordGatewayConnectionDiagnostic({
        deviceId,
        route: ROUTE,
        httpStatus: 200,
        durationMs: elapsedMs(startedAt),
        kind: 'status',
        gatewayDeviceIdHeader,
      })
      return NextResponse.json({
        success: true,
        message: 'SMS already marked delivered via phone gateway',
        jobStatus: 'delivered',
        canonicalStatus: 'DELIVERED_VIA_PHONE',
        duplicate: true,
        serverRevision: existing.serverRevision ?? null,
      })
    }

    if (!canTransitionCanonical(canonicalBefore, 'DELIVERED_VIA_PHONE')) {
      return NextResponse.json(
        {
          success: false,
          code: 'STATUS_REGRESSION',
          message: `Cannot transition ${canonicalBefore} → DELIVERED_VIA_PHONE`,
        },
        { status: 409 }
      )
    }

    if (!legacyMode) {
      if (existing.claimToken && claimToken && existing.claimToken !== claimToken) {
        return NextResponse.json(
          { success: false, code: 'CLAIM_TOKEN_MISMATCH', message: 'Claim token mismatch' },
          { status: 409 }
        )
      }
      if (existing.attemptId && attemptId && existing.attemptId !== attemptId) {
        return NextResponse.json(
          { success: false, code: 'ATTEMPT_ID_MISMATCH', message: 'Attempt ID mismatch' },
          { status: 409 }
        )
      }
      const owner = existing.claimedByDeviceId || existing.lockedBy || existing.assignedDeviceId
      if (owner && owner !== lockedBy) {
        return NextResponse.json(
          { success: false, code: 'WRONG_DEVICE', message: 'Job owned by another device' },
          { status: 403 }
        )
      }
    }

    const deliveredAt = body.deliveredAt
      ? new Date(body.deliveredAt)
      : body.sentAt
        ? new Date(body.sentAt)
        : new Date()

    const job = await SmsFallbackJob.findOneAndUpdate(
      {
        _id: jobId,
        userId: auth.device.userId,
        status: { $in: ['sending', 'claimed', 'pending', 'sent', 'submission_unknown'] },
      },
      {
        $set: {
          status: 'delivered',
          phoneStatus: 'delivered',
          canonicalStatus: 'DELIVERED_VIA_PHONE',
          deliveredAt,
          phoneDeliveredAt: deliveredAt,
          sentAt: existing.sentAt || existing.phoneSentAt || deliveredAt,
          phoneSentAt: existing.phoneSentAt || existing.sentAt || deliveredAt,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
          localMessageId: body.localMessageId || existing.localMessageId,
        },
        $unset: {
          resetReason: 1,
          claimExpiresAt: 1,
          claimToken: 1,
          lockedAt: 1,
          lockedBy: 1,
        },
        $inc: { serverRevision: 1 },
      },
      { new: true }
    )

    if (!job) {
      const again = await SmsFallbackJob.findOne({ _id: jobId, userId: auth.device.userId })
        .select('status serverRevision')
        .lean()
      if (again?.status === 'delivered') {
        return NextResponse.json({
          success: true,
          message: 'SMS marked delivered via phone gateway',
          jobStatus: 'delivered',
          canonicalStatus: 'DELIVERED_VIA_PHONE',
          duplicate: true,
          serverRevision: again.serverRevision ?? null,
        })
      }
      return NextResponse.json(
        { success: false, message: 'Job not found or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        status: 'delivered',
        deliveryStatus: 'delivered',
        deliveredAt,
        deliveryMethod: 'android_phone_gateway',
        fallbackStatus: 'delivered_via_phone',
        fallbackSentAt: job.phoneSentAt || job.sentAt || deliveredAt,
        fallbackDeliveredAt: deliveredAt,
        fallbackProvider: 'android_phone_gateway',
        fallbackJobId: rawJobId,
        fallbackFailedAt: null,
        fallbackFailureReason: null,
        fallbackFailureCode: null,
        requiresPhoneTopUp: false,
        finalizedAt: deliveredAt,
        nextCheckAt: null,
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
    })

    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 200,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    })

    return NextResponse.json({
      success: true,
      message: 'SMS marked delivered via phone gateway',
      jobStatus: 'delivered',
      canonicalStatus: 'DELIVERED_VIA_PHONE',
      serverRevision: job.serverRevision ?? null,
    })
  } catch (error: any) {
    console.error('SMS gateway job delivered error:', error)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

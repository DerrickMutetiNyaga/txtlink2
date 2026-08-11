import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob, SmsMessage } from '@/lib/db/models'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { logGatewayJobAction } from '@/lib/services/sms-gateway/job-logger'
import {
  isTerminalFallbackJobStatus,
  parseGatewayJobId,
} from '@/lib/services/sms-gateway/job-lifecycle'
import { computeClaimExpiresAt } from '@/lib/services/sms-gateway/claim-lease'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'
import {
  canTransitionCanonical,
  toCanonicalStatus,
} from '@/lib/services/sms-gateway/canonical-status'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/sending'

/**
 * Mark modem submission started (CLAIMED → SUBMISSION_STARTED).
 *
 * New Android: requires claimToken + attemptId (idempotent for same attempt).
 * Legacy Android: accepted without tokens while job is claimed/pending by this device.
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

    deviceId = auth.device._id
    const lockedBy = String(auth.device._id)
    gatewayDeviceIdHeader =
      (typeof body.deviceId === 'string' ? body.deviceId : null) ||
      auth.identity.deviceId ||
      gatewayDeviceIdHeader

    if (auth.device.requiresTopUp) {
      return NextResponse.json(
        {
          success: false,
          code: 'GATEWAY_REQUIRES_TOPUP',
          message: 'Phone gateway paused — reload SMS bundle or airtime before claiming jobs',
        },
        { status: 403 }
      )
    }

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

    // Idempotent: same attempt already in SUBMISSION_STARTED
    if (
      existing.status === 'sending' &&
      (existing.claimedByDeviceId === lockedBy || existing.lockedBy === lockedBy)
    ) {
      if (!legacyMode) {
        if (claimToken && existing.claimToken && existing.claimToken !== claimToken) {
          return NextResponse.json(
            { success: false, code: 'CLAIM_TOKEN_MISMATCH', message: 'Claim token mismatch' },
            { status: 409 }
          )
        }
        if (attemptId && existing.attemptId && existing.attemptId !== attemptId) {
          return NextResponse.json(
            { success: false, code: 'ATTEMPT_ID_MISMATCH', message: 'Attempt ID mismatch' },
            { status: 409 }
          )
        }
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
        message: 'Job already marked as sending',
        jobStatus: 'sending',
        canonicalStatus: 'SUBMISSION_STARTED',
        attemptId: existing.attemptId || null,
        claimToken: existing.claimToken || null,
        attemptNumber: existing.attempts || 0,
        duplicate: true,
        serverRevision: existing.serverRevision ?? null,
      })
    }

    // SUBMISSION_UNKNOWN is terminal for automatic resend — never start a new modem attempt.
    // Late SENT/DELIVERED callbacks recover via /sent|/delivered with matching attemptId.
    if (existing.status === 'submission_unknown' || canonicalBefore === 'SUBMISSION_UNKNOWN') {
      return NextResponse.json(
        {
          success: false,
          code: 'SUBMISSION_UNKNOWN',
          message:
            'Submission may have already occurred — awaiting late SENT/DELIVERED; no automatic resend',
          canonicalStatus: 'SUBMISSION_UNKNOWN',
        },
        { status: 409 }
      )
    }

    if (isTerminalFallbackJobStatus(existing.status)) {
      return NextResponse.json(
        { success: false, message: 'Already claimed or already processed' },
        { status: 409 }
      )
    }

    if (!canTransitionCanonical(canonicalBefore, 'SUBMISSION_STARTED')) {
      return NextResponse.json(
        {
          success: false,
          code: 'STATUS_REGRESSION',
          message: `Cannot transition ${canonicalBefore} → SUBMISSION_STARTED`,
        },
        { status: 409 }
      )
    }

    if (!legacyMode) {
      if (!claimToken || !attemptId) {
        return NextResponse.json(
          {
            success: false,
            code: 'CLAIM_REQUIRED',
            message: 'claimToken and attemptId are required',
          },
          { status: 400 }
        )
      }
      if (existing.claimToken !== claimToken) {
        return NextResponse.json(
          { success: false, code: 'CLAIM_TOKEN_MISMATCH', message: 'Claim token mismatch' },
          { status: 409 }
        )
      }
      if (existing.attemptId !== attemptId) {
        return NextResponse.json(
          { success: false, code: 'ATTEMPT_ID_MISMATCH', message: 'Attempt ID mismatch' },
          { status: 409 }
        )
      }
      const owner = existing.claimedByDeviceId || existing.lockedBy || existing.assignedDeviceId
      if (owner && owner !== lockedBy) {
        return NextResponse.json(
          { success: false, code: 'WRONG_DEVICE', message: 'Job claimed by another device' },
          { status: 403 }
        )
      }
      if (existing.claimExpiresAt && new Date(existing.claimExpiresAt).getTime() < Date.now()) {
        return NextResponse.json(
          { success: false, code: 'CLAIM_EXPIRED', message: 'Claim expired' },
          { status: 409 }
        )
      }
    }

    const now = new Date()
    const claimExpiresAt = computeClaimExpiresAt(now)

    // Atomic transition: claimed|pending → sending for this device.
    // Does NOT $inc attempts again (attempt created at pending claim).
    const filter: Record<string, unknown> = {
      _id: jobId,
      userId: auth.device.userId,
      status: { $in: legacyMode ? ['claimed', 'pending'] : ['claimed'] },
    }
    if (!legacyMode) {
      filter.claimToken = claimToken
      filter.attemptId = attemptId
      filter.$or = [
        { claimedByDeviceId: lockedBy },
        { lockedBy: lockedBy },
        { assignedDeviceId: lockedBy },
      ]
    } else {
      filter.$or = [
        { claimedByDeviceId: lockedBy },
        { lockedBy: lockedBy },
        { assignedDeviceId: lockedBy },
        { claimedByDeviceId: { $exists: false }, lockedBy: { $exists: false } },
        { claimedByDeviceId: null },
        { status: 'pending' },
      ]
    }

    const job = await SmsFallbackJob.findOneAndUpdate(
      filter,
      {
        $set: {
          status: 'sending',
          phoneStatus: 'sending',
          canonicalStatus: 'SUBMISSION_STARTED',
          sendingAt: now,
          submissionStartedAt: now,
          lockedAt: now,
          lockedBy,
          claimedByDeviceId: lockedBy,
          assignedDeviceId: lockedBy,
          claimExpiresAt,
          deviceId: lockedBy,
          deviceName: deviceName || auth.device.boundDeviceName,
          simLabel: simLabel || auth.device.boundSimLabel,
        },
        $inc: { serverRevision: 1 },
      },
      { new: true }
    )

    if (!job) {
      // Race: another request won, or already moved — re-read for idempotent success
      const again = await SmsFallbackJob.findOne({ _id: jobId, userId: auth.device.userId }).lean()
      if (
        again?.status === 'sending' &&
        (again.claimedByDeviceId === lockedBy || again.lockedBy === lockedBy) &&
        (!attemptId || !again.attemptId || again.attemptId === attemptId)
      ) {
        return NextResponse.json({
          success: true,
          message: 'Job already marked as sending',
          jobStatus: 'sending',
          canonicalStatus: 'SUBMISSION_STARTED',
          duplicate: true,
          attemptId: again.attemptId || null,
          attemptNumber: again.attempts || 0,
          serverRevision: again.serverRevision ?? null,
        })
      }

      logGatewayJobAction({
        route: ROUTE,
        jobId: rawJobId,
        deviceName: deviceName || auth.device.boundDeviceName,
        statusBefore,
        statusAfter: statusBefore,
        responseCode: 409,
        message: 'Already claimed or already processed',
      })
      return NextResponse.json(
        { success: false, message: 'Already claimed or already processed' },
        { status: 409 }
      )
    }

    if (!job.isTest) {
      await SmsMessage.findByIdAndUpdate(job.originalSmsId, {
        fallbackStatus: 'sending_via_phone',
      })
    }

    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      deviceName: job.deviceName,
      statusBefore: statusBefore || 'claimed',
      statusAfter: 'sending',
      responseCode: 200,
      extra: { attempts: job.attempts, legacyMode },
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
      message: 'Job marked as sending',
      jobStatus: 'sending',
      canonicalStatus: 'SUBMISSION_STARTED',
      attemptId: job.attemptId || null,
      claimToken: job.claimToken || null,
      attemptNumber: job.attempts || 0,
      claimExpiresAt: job.claimExpiresAt,
      serverRevision: job.serverRevision ?? null,
      legacyMode,
    })
  } catch (error: any) {
    console.error('SMS gateway job sending error:', error)
    logGatewayJobAction({
      route: ROUTE,
      jobId: rawJobId,
      responseCode: 500,
      message: error?.message,
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
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

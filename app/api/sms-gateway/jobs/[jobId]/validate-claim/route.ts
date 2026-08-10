import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import {
  validateGatewayDevice,
  gatewayAuthErrorResponse,
} from '@/lib/services/sms-gateway/auth'
import { parseGatewayJobId } from '@/lib/services/sms-gateway/job-lifecycle'
import { validateJobClaim } from '@/lib/services/sms-gateway/claim-validation'
import { recordGatewayConnectionDiagnostic } from '@/lib/services/sms-gateway/diagnostics'
import { elapsedMs, nowMs } from '@/lib/services/sms-gateway/timing'

type RouteContext = { params: Promise<{ jobId: string }> }

const ROUTE = 'POST /api/sms-gateway/jobs/[jobId]/validate-claim'

/**
 * Pre-send claim validation (+ optional lease renewal).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { jobId: rawJobId } = await context.params
  const jobId = parseGatewayJobId(rawJobId)
  const startedAt = nowMs()
  let deviceId: unknown = null
  let gatewayDeviceIdHeader: string | null = request.headers.get('x-gateway-device-id')

  try {
    const body = await request.json().catch(() => ({}))
    const claimToken = typeof body.claimToken === 'string' ? body.claimToken : null
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : null
    const renew = body.renew !== false

    const auth = await validateGatewayDevice(request, {
      route: ROUTE,
      body: {
        deviceName: body.deviceName,
        simLabel: body.simLabel,
        deviceId: body.deviceId,
      },
    })
    if (!auth.ok) {
      return gatewayAuthErrorResponse(auth)
    }

    deviceId = auth.device._id
    gatewayDeviceIdHeader =
      (typeof body.deviceId === 'string' ? body.deviceId : null) ||
      auth.identity.deviceId ||
      gatewayDeviceIdHeader

    if (!jobId) {
      return NextResponse.json(
        { valid: false, reason: 'INVALID_JOB_ID', canonicalStatus: null },
        { status: 400 }
      )
    }

    if (!claimToken || !attemptId) {
      return NextResponse.json(
        {
          valid: false,
          reason: 'CLAIM_REQUIRED',
          message: 'claimToken and attemptId are required',
          canonicalStatus: null,
        },
        { status: 400 }
      )
    }

    await connectDB()

    const result = await validateJobClaim({
      jobId,
      userId: auth.device.userId,
      deviceId: String(auth.device._id),
      claimToken,
      attemptId,
      renew,
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
      valid: result.valid,
      reason: result.reason || null,
      canonicalStatus: result.canonicalStatus || null,
      claimExpiresAt: result.claimExpiresAt
        ? new Date(result.claimExpiresAt).toISOString()
        : null,
      serverRevision: result.serverRevision ?? null,
      renewed: Boolean(result.valid && renew),
    })
  } catch (error: any) {
    console.error('SMS gateway validate-claim error:', error)
    await recordGatewayConnectionDiagnostic({
      deviceId,
      route: ROUTE,
      httpStatus: 500,
      durationMs: elapsedMs(startedAt),
      kind: 'status',
      gatewayDeviceIdHeader,
    }).catch(() => undefined)
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

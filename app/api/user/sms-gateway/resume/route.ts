import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { logGatewayAudit } from '@/lib/services/sms-gateway/audit'
import mongoose from 'mongoose'

/**
 * Resume gateway / clear transient pause / resume a specific SIM.
 * Does not resend messages already submitted.
 *
 * Body:
 *  - scope?: 'transient' | 'sim' | 'all' (default all safe clears)
 *  - subscriptionId?: string
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)
    const body = await request.json().catch(() => ({}))
    const scope = body.scope || 'all'
    const subscriptionId =
      typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : null

    const device = await SmsGatewayDevice.findOne({ userId })
    if (!device) {
      return NextResponse.json({ error: 'No gateway device found' }, { status: 404 })
    }

    if (scope === 'sim' || subscriptionId) {
      const target = subscriptionId || device.pausedSubscriptionId
      if (device.pauseScope === 'SIM' && target && device.pausedSubscriptionId === target) {
        device.requiresTopUp = false
        device.topUpAlertDismissed = false
        device.pauseReason = undefined
        device.pausedAt = undefined
        device.pauseScope = undefined
        device.pausedSubscriptionId = undefined
        device.failureCategory = undefined
        device.resumedAt = new Date()
        device.resumedBy = user.userId
        await device.save()
        await logGatewayAudit(user.userId, 'GATEWAY_SIM_RESUMED', String(device._id), {
          subscriptionId: target,
        })
        return NextResponse.json({
          success: true,
          message: `SIM ${target} resumed. Eligible queued jobs remain available — nothing is resent.`,
        })
      }
    }

    if (scope === 'transient') {
      device.consecutiveTransientFailures = 0
      device.lastTransientError = undefined
      if (device.pauseScope !== 'SIM') {
        device.pauseReason = undefined
        device.pausedAt = undefined
        device.pauseScope = undefined
      }
      device.resumedAt = new Date()
      device.resumedBy = user.userId
      device.syncHealth = 'UP_TO_DATE'
      await device.save()
      await logGatewayAudit(user.userId, 'GATEWAY_TRANSIENT_PAUSE_CLEARED', String(device._id), {})
      return NextResponse.json({
        success: true,
        message: 'Transient pause cleared. Pending jobs were not modified or resent.',
      })
    }

    // Default: clear gateway + SIM pauses safely
    device.requiresTopUp = false
    device.topUpAlertDismissed = false
    device.pauseReason = undefined
    device.pausedAt = undefined
    device.pauseScope = undefined
    device.pausedSubscriptionId = undefined
    device.consecutiveTransientFailures = 0
    device.lastTransientError = undefined
    device.isGatewayRunning = true
    device.serviceState = 'RUNNING'
    device.resumedAt = new Date()
    device.resumedBy = user.userId
    await device.save()

    await logGatewayAudit(user.userId, 'GATEWAY_SIM_RESUMED', String(device._id), {
      scope: 'all',
    })

    return NextResponse.json({
      success: true,
      message:
        'Gateway resumed. Eligible queued jobs are available again — already submitted messages are not resent. Use Retry blocked jobs if top-up jobs need re-queue.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Resume SMS gateway error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

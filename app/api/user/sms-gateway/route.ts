import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice, SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { computeGatewayConnectionStatus } from '@/lib/services/sms-gateway/status'
import mongoose from 'mongoose'

function formatDevice(
  device: Record<string, unknown> | null,
  pendingPhoneJobs: number,
  blockedTopUpJobs = 0
) {
  if (!device) {
    return {
      hasToken: false,
      isActive: false,
      isOnline: false,
      connectionStatus: 'not_connected' as const,
      tokenStatus: 'none' as const,
      pendingPhoneJobs: 0,
      blockedTopUpJobs: 0,
      showTopUpAlert: false,
      secondsSinceLastContact: null,
      diagnostics: null,
    }
  }

  const isActive = Boolean(device.isActive)
  const requiresTopUp = Boolean(device.requiresTopUp)
  const topUpAlertDismissed = Boolean(device.topUpAlertDismissed)

  const { connectionStatus, isOnline, latestActivityAt, secondsSinceLastContact } =
    computeGatewayConnectionStatus({
      isActive,
      boundDeviceFingerprint: device.boundDeviceFingerprint as string | null | undefined,
      isGatewayRunning: device.isGatewayRunning as boolean | null | undefined,
      lastHeartbeatAt: device.lastHeartbeatAt as Date | string | null | undefined,
      lastSyncAt: device.lastSyncAt as Date | string | null | undefined,
      lastSeenAt: device.lastSeenAt as Date | string | null | undefined,
      lastPendingRequestAt: device.lastPendingRequestAt as Date | string | null | undefined,
      lastHttpAt: device.lastHttpAt as Date | string | null | undefined,
      lastStatusUpdateAt: device.lastStatusUpdateAt as Date | string | null | undefined,
    })

  return {
    hasToken: true,
    isActive,
    isOnline,
    connectionStatus,
    latestActivityAt: latestActivityAt?.toISOString() || null,
    secondsSinceLastContact,
    tokenStatus: isActive ? ('active' as const) : ('revoked' as const),
    label: device.label || 'Phone Gateway',
    boundDeviceName: device.boundDeviceName || null,
    boundSimLabel: device.boundSimLabel || null,
    lastHeartbeatAt: device.lastHeartbeatAt || null,
    lastSeenAt: device.lastSeenAt || null,
    lastSyncAt: device.lastSyncAt || null,
    lastPendingRequestAt: device.lastPendingRequestAt || null,
    lastPendingSuccessAt: device.lastPendingSuccessAt || null,
    lastPendingJobsReturned:
      typeof device.lastPendingJobsReturned === 'number' ? device.lastPendingJobsReturned : null,
    lastHttpAt: device.lastHttpAt || null,
    lastHttpRoute: device.lastHttpRoute || null,
    lastHttpStatus: typeof device.lastHttpStatus === 'number' ? device.lastHttpStatus : null,
    lastHttpDurationMs:
      typeof device.lastHttpDurationMs === 'number' ? device.lastHttpDurationMs : null,
    lastDbQueryDurationMs:
      typeof device.lastDbQueryDurationMs === 'number' ? device.lastDbQueryDurationMs : null,
    lastStatusUpdateAt: device.lastStatusUpdateAt || null,
    lastIp: device.lastIp || null,
    lastUserAgent: device.lastUserAgent || null,
    appVersion: device.appVersion || null,
    batteryLevel: device.batteryLevel ?? null,
    isSmsPermissionGranted: device.isSmsPermissionGranted ?? null,
    isGatewayRunning: device.isGatewayRunning ?? null,
    requiresTopUp,
    showTopUpAlert: requiresTopUp,
    blockedTopUpJobs,
    pendingPhoneJobs,
    lastFailureAt: device.lastFailureAt || null,
    lastFailureReason: device.lastFailureReason || null,
    lastFailureCode: device.lastFailureCode || null,
    pausedAt: device.pausedAt || null,
    pauseReason: device.pauseReason || null,
    topUpAlertDismissed,
    updatedAt: device.updatedAt || null,
    diagnostics: {
      lastHeartbeatAt: device.lastHeartbeatAt || null,
      lastPendingRequestAt: device.lastPendingRequestAt || null,
      lastPendingSuccessAt: device.lastPendingSuccessAt || null,
      lastHttpAt: device.lastHttpAt || null,
      lastHttpRoute: device.lastHttpRoute || null,
      lastHttpStatus: typeof device.lastHttpStatus === 'number' ? device.lastHttpStatus : null,
      lastHttpDurationMs:
        typeof device.lastHttpDurationMs === 'number' ? device.lastHttpDurationMs : null,
      lastDbQueryDurationMs:
        typeof device.lastDbQueryDurationMs === 'number' ? device.lastDbQueryDurationMs : null,
      jobsReturnedLastPoll:
        typeof device.lastPendingJobsReturned === 'number' ? device.lastPendingJobsReturned : null,
      lastStatusUpdateAt: device.lastStatusUpdateAt || null,
      isOnline,
      connectionStatus,
      secondsSinceLastContact,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const [device, pendingPhoneJobs, blockedTopUpJobs] = await Promise.all([
      SmsGatewayDevice.findOne({ userId }).lean(),
      SmsFallbackJob.countDocuments({
        userId,
        status: 'pending',
        isTest: { $ne: true },
      }),
      SmsFallbackJob.countDocuments({
        userId,
        status: 'blocked',
        requiresTopUp: true,
      }),
    ])

    return NextResponse.json({
      success: true,
      gateway: formatDevice(
        device as Record<string, unknown> | null,
        pendingPhoneJobs,
        blockedTopUpJobs
      ),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get SMS gateway status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

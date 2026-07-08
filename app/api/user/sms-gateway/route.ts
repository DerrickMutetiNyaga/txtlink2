import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice, SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { computeGatewayConnectionStatus } from '@/lib/services/sms-gateway/status'
import mongoose from 'mongoose'

function formatDevice(
  device: Record<string, unknown> | null,
  pendingPhoneJobs: number
) {
  if (!device) {
    return {
      hasToken: false,
      isActive: false,
      isOnline: false,
      connectionStatus: 'not_connected' as const,
      tokenStatus: 'none' as const,
      pendingPhoneJobs: 0,
      showTopUpAlert: false,
    }
  }

  const isActive = Boolean(device.isActive)
  const requiresTopUp = Boolean(device.requiresTopUp)
  const topUpAlertDismissed = Boolean(device.topUpAlertDismissed)

  const { connectionStatus, isOnline, latestActivityAt } = computeGatewayConnectionStatus({
    isActive,
    boundDeviceFingerprint: device.boundDeviceFingerprint as string | null | undefined,
    isGatewayRunning: device.isGatewayRunning as boolean | null | undefined,
    lastHeartbeatAt: device.lastHeartbeatAt as Date | string | null | undefined,
    lastSyncAt: device.lastSyncAt as Date | string | null | undefined,
  })

  return {
    hasToken: true,
    isActive,
    isOnline,
    connectionStatus,
    latestActivityAt: latestActivityAt?.toISOString() || null,
    tokenStatus: isActive ? ('active' as const) : ('revoked' as const),
    label: device.label || 'Phone Gateway',
    boundDeviceName: device.boundDeviceName || null,
    boundSimLabel: device.boundSimLabel || null,
    lastHeartbeatAt: device.lastHeartbeatAt || null,
    lastSyncAt: device.lastSyncAt || null,
    lastIp: device.lastIp || null,
    lastUserAgent: device.lastUserAgent || null,
    appVersion: device.appVersion || null,
    batteryLevel: device.batteryLevel ?? null,
    isSmsPermissionGranted: device.isSmsPermissionGranted ?? null,
    isGatewayRunning: device.isGatewayRunning ?? null,
    requiresTopUp,
    showTopUpAlert: requiresTopUp && !topUpAlertDismissed,
    lastFailureAt: device.lastFailureAt || null,
    lastFailureReason: device.lastFailureReason || null,
    lastFailureCode: device.lastFailureCode || null,
    pausedAt: device.pausedAt || null,
    pauseReason: device.pauseReason || null,
    pendingPhoneJobs,
    createdAt: device.createdAt || null,
    updatedAt: device.updatedAt || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const [device, pendingPhoneJobs] = await Promise.all([
      SmsGatewayDevice.findOne({ userId }).lean(),
      SmsFallbackJob.countDocuments({
        userId,
        status: 'pending',
        isTest: { $ne: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      gateway: formatDevice(device as Record<string, unknown> | null, pendingPhoneJobs),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get SMS gateway status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

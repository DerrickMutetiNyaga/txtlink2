import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice, SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import {
  computeGatewayConnectionStatus,
  listSimStates,
} from '@/lib/services/sms-gateway/status'
import { repairGatewayDeviceConfigAndPause } from '@/lib/services/sms-gateway/migrate-config'
import { GATEWAY_SETUP_DEFAULTS } from '@/lib/services/sms-gateway/config'
import mongoose from 'mongoose'

function formatDevice(
  device: Record<string, unknown> | null,
  counts: {
    pendingPhoneJobs: number
    blockedTopUpJobs: number
    sentViaPhone: number
    deliveredViaPhone: number
    awaitingDelivery: number
    manualReview: number
  }
) {
  if (!device) {
    return {
      hasToken: false,
      isActive: false,
      isOnline: false,
      deviceOnline: false,
      deviceSynchronized: false,
      connectionStatus: 'not_connected' as const,
      serviceState: 'STOPPED_BY_USER',
      syncHealth: 'UNKNOWN',
      tokenStatus: 'none' as const,
      pendingPhoneJobs: 0,
      blockedTopUpJobs: 0,
      sentViaPhone: 0,
      deliveredViaPhone: 0,
      awaitingDelivery: 0,
      manualReview: 0,
      showTopUpAlert: false,
      sims: [],
      setupDefaults: GATEWAY_SETUP_DEFAULTS,
    }
  }

  const isActive = Boolean(device.isActive)
  const requiresTopUp = Boolean(device.requiresTopUp)
  const topUpAlertDismissed = Boolean(device.topUpAlertDismissed)

  const status = computeGatewayConnectionStatus({
    isActive,
    boundDeviceFingerprint: device.boundDeviceFingerprint as string | null | undefined,
    isGatewayRunning: device.isGatewayRunning as boolean | null | undefined,
    lastHeartbeatAt: device.lastHeartbeatAt as Date | string | null | undefined,
    lastSyncAt: device.lastSyncAt as Date | string | null | undefined,
    pausedAt: device.pausedAt as Date | string | null | undefined,
    pauseScope: device.pauseScope as 'GATEWAY' | 'SIM' | null | undefined,
    pauseReason: device.pauseReason as string | null | undefined,
    consecutiveTransientFailures: device.consecutiveTransientFailures as number | null,
    lastTransientError: device.lastTransientError as string | null,
    lastSuccessfulStatusAt: device.lastSuccessfulStatusAt as Date | string | null,
    requiresTopUp,
  })

  const sims = listSimStates({
    activeSubscriptions: device.activeSubscriptions as
      | Array<{ subscriptionId: string; label?: string; state?: string }>
      | undefined,
    boundSimLabel: device.boundSimLabel as string | null | undefined,
    requiresTopUp,
    pauseScope: device.pauseScope as 'GATEWAY' | 'SIM' | null | undefined,
    pausedSubscriptionId: device.pausedSubscriptionId as string | null | undefined,
    failureCategory: device.failureCategory as string | null | undefined,
  })

  return {
    hasToken: true,
    isActive,
    isOnline: status.isOnline,
    deviceOnline: status.deviceOnline,
    deviceSynchronized: status.deviceSynchronized,
    connectionStatus: status.connectionStatus,
    serviceState: status.serviceState,
    syncHealth: status.syncHealth,
    latestActivityAt: status.latestActivityAt?.toISOString() || null,
    tokenStatus: isActive ? ('active' as const) : ('revoked' as const),
    label: device.label || 'Phone Gateway',
    boundDeviceName: device.boundDeviceName || null,
    boundSimLabel: device.boundSimLabel || null,
    lastHeartbeatAt: device.lastHeartbeatAt || null,
    lastSyncAt: device.lastSyncAt || null,
    lastJobFetchedAt: device.lastJobFetchedAt || null,
    lastPhoneSendAt: device.lastPhoneSendAt || null,
    lastSuccessfulStatusAt: device.lastSuccessfulStatusAt || null,
    lastIp: device.lastIp || null,
    lastUserAgent: device.lastUserAgent || null,
    appVersion: device.appVersion || null,
    batteryLevel: device.batteryLevel ?? null,
    isSmsPermissionGranted: device.isSmsPermissionGranted ?? null,
    isGatewayRunning: device.isGatewayRunning ?? null,
    requiresTopUp,
    showTopUpAlert: requiresTopUp,
    ...counts,
    lastFailureAt: device.lastFailureAt || null,
    lastFailureReason: device.lastFailureReason || null,
    lastFailureCode: device.lastFailureCode || null,
    lastTransientError: device.lastTransientError || null,
    consecutiveTransientFailures: device.consecutiveTransientFailures || 0,
    consecutiveFailureCount: device.consecutiveFailureCount || 0,
    pausedAt: device.pausedAt || null,
    pauseReason: device.pauseReason || null,
    pauseScope: device.pauseScope || null,
    pausedSubscriptionId: device.pausedSubscriptionId || null,
    failureCategory: device.failureCategory || null,
    topUpAlertDismissed,
    clientPauseOnFailure: device.clientPauseOnFailure ?? GATEWAY_SETUP_DEFAULTS.pauseOnFailure,
    clientMaxFailuresBeforePause:
      device.clientMaxFailuresBeforePause ?? GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause,
    configMigratedAt: device.configMigratedAt || null,
    sims,
    setupDefaults: GATEWAY_SETUP_DEFAULTS,
    liveUpdateNote: 'Near-real-time while connected, with automatic recovery.',
    updatedAt: device.updatedAt || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const deviceDoc = await SmsGatewayDevice.findOne({ userId })
    if (deviceDoc) {
      await repairGatewayDeviceConfigAndPause(deviceDoc)
    }

    const [
      device,
      pendingPhoneJobs,
      blockedTopUpJobs,
      sentViaPhone,
      deliveredViaPhone,
      awaitingDelivery,
      manualReview,
    ] = await Promise.all([
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
      SmsFallbackJob.countDocuments({
        userId,
        status: 'sent',
        isTest: { $ne: true },
      }),
      SmsFallbackJob.countDocuments({
        userId,
        status: 'delivered',
        isTest: { $ne: true },
      }),
      SmsFallbackJob.countDocuments({
        userId,
        status: 'sent',
        phoneStatus: { $in: ['sent', null] },
        deliveredAt: null,
        isTest: { $ne: true },
      }),
      SmsFallbackJob.countDocuments({
        userId,
        status: 'failed',
        isTest: { $ne: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      gateway: formatDevice(device as Record<string, unknown> | null, {
        pendingPhoneJobs,
        blockedTopUpJobs,
        sentViaPhone,
        deliveredViaPhone,
        awaitingDelivery,
        manualReview,
      }),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get SMS gateway status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

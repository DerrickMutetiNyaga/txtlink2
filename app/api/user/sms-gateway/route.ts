import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { isDeviceOnline } from '@/lib/services/sms-gateway/auth'
import mongoose from 'mongoose'

function formatDevice(device: Record<string, unknown> | null) {
  if (!device) {
    return {
      hasToken: false,
      isActive: false,
      isOnline: false,
      connectionStatus: 'not_connected' as const,
      tokenStatus: 'none' as const,
    }
  }

  const lastHeartbeatAt = device.lastHeartbeatAt as Date | undefined
  const isActive = Boolean(device.isActive)
  const isOnline = isActive && isDeviceOnline(lastHeartbeatAt)
  const hasBinding = Boolean(device.boundDeviceFingerprint)

  let connectionStatus: 'online' | 'offline' | 'waiting' | 'not_connected' = 'not_connected'
  if (!isActive) {
    connectionStatus = 'not_connected'
  } else if (!hasBinding) {
    connectionStatus = 'waiting'
  } else if (isOnline) {
    connectionStatus = 'online'
  } else {
    connectionStatus = 'offline'
  }

  return {
    hasToken: true,
    isActive,
    isOnline,
    connectionStatus,
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
    createdAt: device.createdAt || null,
    updatedAt: device.updatedAt || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const device = await SmsGatewayDevice.findOne({ userId }).lean()

    return NextResponse.json({
      success: true,
      gateway: formatDevice(device as Record<string, unknown> | null),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get SMS gateway status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

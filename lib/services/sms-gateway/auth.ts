import crypto from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsGatewayDevice, ISmsGatewayDevice } from '@/lib/db/models'

export function getSmsGatewayTokenSecret(): string {
  const secret = process.env.SMS_GATEWAY_TOKEN_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('SMS_GATEWAY_TOKEN_SECRET is not configured')
  }
  return secret
}

export function hashGatewayToken(token: string): string {
  return crypto.createHmac('sha256', getSmsGatewayTokenSecret()).update(token).digest('hex')
}

/** Stable fingerprint from app-generated device ID. */
export function hashStableDeviceId(deviceId: string): string {
  return crypto
    .createHmac('sha256', getSmsGatewayTokenSecret())
    .update(`gateway-device:${deviceId.trim()}`)
    .digest('hex')
}

/** Last-resort fingerprint when no stable device ID is available. */
export function hashDeviceNameSimFingerprint(deviceName: string, simLabel: string): string {
  return crypto
    .createHmac('sha256', getSmsGatewayTokenSecret())
    .update(`gateway-namesim:${deviceName.trim()}|${simLabel.trim()}`)
    .digest('hex')
}

export function generateGatewayToken(): string {
  const random = crypto.randomBytes(24).toString('hex')
  return `gw_live_${random}`
}

export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice(7).trim()
  return token || null
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export interface GatewayDeviceIdentity {
  deviceId: string | null
  deviceName: string
  simLabel: string
}

export function extractGatewayIdentity(
  request: NextRequest,
  body: Record<string, unknown> = {}
): GatewayDeviceIdentity {
  const headerDeviceId = request.headers.get('x-gateway-device-id')?.trim() || null
  const bodyDeviceId =
    typeof body.deviceId === 'string' && body.deviceId.trim() ? body.deviceId.trim() : null

  const { searchParams } = new URL(request.url)
  const deviceName =
    (typeof body.deviceName === 'string' ? body.deviceName : searchParams.get('deviceName')) ||
    ''
  const simLabel =
    (typeof body.simLabel === 'string' ? body.simLabel : searchParams.get('simLabel')) || ''

  return {
    deviceId: headerDeviceId || bodyDeviceId,
    deviceName: deviceName.trim(),
    simLabel: simLabel.trim(),
  }
}

/** Resolve the fingerprint to compare or bind for this request. */
export function resolveIncomingFingerprint(identity: GatewayDeviceIdentity): string | null {
  if (identity.deviceId) {
    return hashStableDeviceId(identity.deviceId)
  }
  if (identity.deviceName || identity.simLabel) {
    return hashDeviceNameSimFingerprint(identity.deviceName, identity.simLabel)
  }
  return null
}

export type GatewayAuthCode =
  | 'UNAUTHORIZED'
  | 'TOKEN_DISABLED'
  | 'TOKEN_BOUND_TO_ANOTHER_DEVICE'

export type GatewayAuthResult =
  | {
      ok: true
      device: ISmsGatewayDevice & { _id: unknown }
      identity: GatewayDeviceIdentity
    }
  | {
      ok: false
      status: 401 | 403
      code: GatewayAuthCode
      message: string
      logContext?: GatewayAuthLogContext
    }

export interface GatewayAuthLogContext {
  route: string
  tokenHashPrefix: string
  boundDeviceName?: string | null
  boundSimLabel?: string | null
  incomingDeviceId?: string | null
  incomingDeviceName?: string | null
  incomingSimLabel?: string | null
  reason: string
}

function logGatewayAuthReject(context: GatewayAuthLogContext) {
  console.log('[sms-gateway-auth]', JSON.stringify({ ...context, at: new Date().toISOString() }))
}

function authFailure(
  status: 401 | 403,
  code: GatewayAuthCode,
  message: string,
  logContext?: GatewayAuthLogContext
): GatewayAuthResult {
  if (logContext) {
    logGatewayAuthReject(logContext)
  }
  return { ok: false, status, code, message, logContext }
}

export interface ValidateGatewayOptions {
  route: string
  body?: Record<string, unknown>
}

export async function validateGatewayDevice(
  request: NextRequest,
  options: ValidateGatewayOptions
): Promise<GatewayAuthResult> {
  await connectDB()

  const route = options.route
  const identity = extractGatewayIdentity(request, options.body ?? {})
  const token = extractBearerToken(request)

  if (!token) {
    return authFailure(401, 'UNAUTHORIZED', 'Unauthorized', {
      route,
      tokenHashPrefix: 'none',
      incomingDeviceId: identity.deviceId,
      incomingDeviceName: identity.deviceName || null,
      incomingSimLabel: identity.simLabel || null,
      reason: 'missing_bearer_token',
    })
  }

  const tokenHash = hashGatewayToken(token)
  const tokenHashPrefix = tokenHash.slice(0, 12)
  const device = await SmsGatewayDevice.findOne({ tokenHash })

  if (!device) {
    return authFailure(401, 'UNAUTHORIZED', 'Unauthorized', {
      route,
      tokenHashPrefix,
      incomingDeviceId: identity.deviceId,
      incomingDeviceName: identity.deviceName || null,
      incomingSimLabel: identity.simLabel || null,
      reason: 'token_not_found',
    })
  }

  if (!device.isActive) {
    return authFailure(403, 'TOKEN_DISABLED', 'Device token disabled', {
      route,
      tokenHashPrefix,
      boundDeviceName: device.boundDeviceName,
      boundSimLabel: device.boundSimLabel,
      incomingDeviceId: identity.deviceId,
      incomingDeviceName: identity.deviceName || null,
      incomingSimLabel: identity.simLabel || null,
      reason: 'token_inactive',
    })
  }

  const incomingFingerprint = resolveIncomingFingerprint(identity)

  if (!device.boundDeviceFingerprint) {
    if (incomingFingerprint) {
      device.boundDeviceFingerprint = incomingFingerprint
      if (identity.deviceName) device.boundDeviceName = identity.deviceName
      if (identity.simLabel) device.boundSimLabel = identity.simLabel
      await device.save()
    }
    return { ok: true, device, identity }
  }

  if (!incomingFingerprint) {
    return { ok: true, device, identity }
  }

  if (incomingFingerprint === device.boundDeviceFingerprint) {
    let dirty = false
    if (identity.deviceName && device.boundDeviceName !== identity.deviceName) {
      device.boundDeviceName = identity.deviceName
      dirty = true
    }
    if (identity.simLabel && device.boundSimLabel !== identity.simLabel) {
      device.boundSimLabel = identity.simLabel
      dirty = true
    }
    if (dirty) {
      await device.save()
    }
    return { ok: true, device, identity }
  }

  return authFailure(
    403,
    'TOKEN_BOUND_TO_ANOTHER_DEVICE',
    'This device token is already linked to another device. Reset device binding from the website.',
    {
      route,
      tokenHashPrefix,
      boundDeviceName: device.boundDeviceName,
      boundSimLabel: device.boundSimLabel,
      incomingDeviceId: identity.deviceId,
      incomingDeviceName: identity.deviceName || null,
      incomingSimLabel: identity.simLabel || null,
      reason: 'fingerprint_mismatch',
    }
  )
}

/** @deprecated Use validateGatewayDevice */
export async function authenticateGatewayDevice(
  request: NextRequest,
  deviceName = '',
  simLabel = ''
): Promise<GatewayAuthResult> {
  return validateGatewayDevice(request, {
    route: 'legacy',
    body: { deviceName, simLabel },
  })
}

export function gatewayAuthErrorResponse(auth: Extract<GatewayAuthResult, { ok: false }>) {
  return NextResponse.json(
    {
      success: false,
      code: auth.code,
      message: auth.message,
    },
    { status: auth.status }
  )
}

export function clearGatewayBindingFields(device: ISmsGatewayDevice) {
  device.boundDeviceFingerprint = undefined
  device.boundDeviceName = undefined
  device.boundSimLabel = undefined
  device.lastFailureAt = undefined
  device.lastFailureReason = undefined
  device.lastFailureCode = undefined
  device.requiresTopUp = false
  device.topUpAlertDismissed = false
  device.pausedAt = undefined
  device.pauseReason = undefined
}

export function clearGatewayTokenActivationFields(device: ISmsGatewayDevice) {
  clearGatewayBindingFields(device)
  device.lastHeartbeatAt = undefined
  device.lastSyncAt = undefined
  device.lastIp = undefined
  device.lastUserAgent = undefined
  device.appVersion = undefined
  device.batteryLevel = undefined
  device.isSmsPermissionGranted = undefined
  device.isGatewayRunning = undefined
}

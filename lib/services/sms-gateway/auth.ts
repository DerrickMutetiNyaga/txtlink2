import crypto from 'crypto'
import { NextRequest } from 'next/server'
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

export function hashDeviceFingerprint(
  deviceName: string,
  simLabel: string,
  userAgent: string
): string {
  const raw = `${deviceName}|${simLabel}|${userAgent}`
  return crypto.createHmac('sha256', getSmsGatewayTokenSecret()).update(raw).digest('hex')
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

export type GatewayAuthResult =
  | { ok: true; device: ISmsGatewayDevice & { _id: unknown } }
  | { ok: false; status: 401 | 403; message: string }

export async function authenticateGatewayDevice(
  request: NextRequest,
  deviceName = '',
  simLabel = ''
): Promise<GatewayAuthResult> {
  await connectDB()

  const token = extractBearerToken(request)
  if (!token) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const tokenHash = hashGatewayToken(token)
  const device = await SmsGatewayDevice.findOne({ tokenHash })

  if (!device) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  if (!device.isActive) {
    return { ok: false, status: 403, message: 'Device token disabled' }
  }

  const userAgent = request.headers.get('user-agent') || 'unknown'
  const fingerprint = hashDeviceFingerprint(deviceName, simLabel, userAgent)

  if (device.boundDeviceFingerprint) {
    if (device.boundDeviceFingerprint !== fingerprint) {
      return {
        ok: false,
        status: 403,
        message: 'This device token is already linked to another device.',
      }
    }
  } else {
    device.boundDeviceFingerprint = fingerprint
    if (deviceName) device.boundDeviceName = deviceName
    if (simLabel) device.boundSimLabel = simLabel
    device.lastIp = getClientIp(request)
    device.lastUserAgent = userAgent
    await device.save()
  }

  return { ok: true, device }
}

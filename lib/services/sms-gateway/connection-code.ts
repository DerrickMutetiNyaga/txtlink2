export const GATEWAY_SETUP_DEFAULTS = {
  deviceName: 'TXTLINK Phone 1',
  pollIntervalSeconds: 10,
  smsDelaySeconds: 5,
  hourlyLimit: 100,
  dailyLimit: 500,
  pauseOnFailure: true,
  maxFailuresBeforePause: 1,
} as const

export const CONNECTION_CODE_PREFIX = 'txtlink_gateway_setup'

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

export const INVALID_PUBLIC_ORIGIN_MESSAGE =
  'Invalid public website URL. Reload the page from the public domain and generate a new connection code.'

export interface GatewaySetupPayload {
  type: 'txtlink_gateway_setup'
  apiBaseUrl: string
  deviceToken: string
  deviceName: string
  pollIntervalSeconds: number
  smsDelaySeconds: number
  hourlyLimit: number
  dailyLimit: number
  pauseOnFailure: boolean
  maxFailuresBeforePause: number
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return (
      LOCALHOST_HOSTS.has(hostname) ||
      hostname.endsWith('.localhost') ||
      /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin)
    )
  } catch {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(origin)
  }
}

export function normalizePublicOrigin(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return url.origin
  } catch {
    return null
  }
}

export function assertValidPublicOrigin(origin: string): void {
  if (isProductionEnv()) {
    if (isLocalhostOrigin(origin)) {
      throw new Error(INVALID_PUBLIC_ORIGIN_MESSAGE)
    }
    if (!origin.startsWith('https://')) {
      throw new Error(INVALID_PUBLIC_ORIGIN_MESSAGE)
    }
  }
}

export function resolvePublicOriginFromRequest(
  request: { headers: Headers; nextUrl: { origin: string } },
  bodyPublicOrigin?: string | null
): string {
  const candidates: Array<string | null> = [
    normalizePublicOrigin(bodyPublicOrigin),
    normalizePublicOrigin(request.headers.get('origin')),
  ]

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (forwardedProto && forwardedHost) {
    candidates.push(normalizePublicOrigin(`${forwardedProto}://${forwardedHost}`))
  }

  candidates.push(normalizePublicOrigin(request.nextUrl.origin))

  for (const candidate of candidates) {
    if (!candidate) continue
    if (isProductionEnv() && isLocalhostOrigin(candidate)) continue
    assertValidPublicOrigin(candidate)
    return candidate
  }

  if (isProductionEnv()) {
    throw new Error(INVALID_PUBLIC_ORIGIN_MESSAGE)
  }

  const devOrigin = candidates.find((candidate) => candidate != null)
  if (devOrigin) {
    return devOrigin
  }

  throw new Error(INVALID_PUBLIC_ORIGIN_MESSAGE)
}

export function resolveGatewayApiBaseUrl(origin: string): string {
  const normalizedOrigin = normalizePublicOrigin(origin)
  if (!normalizedOrigin) {
    throw new Error(INVALID_PUBLIC_ORIGIN_MESSAGE)
  }

  assertValidPublicOrigin(normalizedOrigin)

  const apiBaseUrl = `${normalizedOrigin}/api/sms-gateway`

  if (isProductionEnv() && isLocalhostOrigin(apiBaseUrl)) {
    throw new Error(INVALID_PUBLIC_ORIGIN_MESSAGE)
  }

  return apiBaseUrl
}

export function buildGatewaySetupPayload(
  apiBaseUrl: string,
  deviceToken: string
): GatewaySetupPayload {
  return {
    type: 'txtlink_gateway_setup',
    apiBaseUrl,
    deviceToken,
    ...GATEWAY_SETUP_DEFAULTS,
  }
}

export function encodeConnectionCode(payload: GatewaySetupPayload): string {
  const json = JSON.stringify(payload)
  const base64url = Buffer.from(json, 'utf8').toString('base64url')
  return `${CONNECTION_CODE_PREFIX}:${base64url}`
}

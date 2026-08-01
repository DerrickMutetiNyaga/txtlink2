import {
  GATEWAY_SETUP_DEFAULTS,
  resolveGatewaySetupConfig,
  type GatewaySetupConfig,
} from './config'
import {
  INVALID_GATEWAY_API_BASE_URL_MESSAGE,
  isLocalhostUrl,
  isProductionEnv,
  normalizeGatewayApiBaseUrl,
  resolveGatewayApiBaseUrlFromOrigin,
} from './api-base-url'

export { GATEWAY_SETUP_DEFAULTS } from './config'
export {
  INVALID_GATEWAY_API_BASE_URL_MESSAGE as INVALID_PUBLIC_ORIGIN_MESSAGE,
  isProductionEnv,
  isLocalhostUrl as isLocalhostOrigin,
  normalizeGatewayApiBaseUrl,
  resolveGatewayApiBaseUrlFromOrigin,
} from './api-base-url'

export const CONNECTION_CODE_PREFIX = 'txtlink_gateway_setup'

export interface GatewaySetupPayload extends GatewaySetupConfig {
  type: 'txtlink_gateway_setup'
  apiBaseUrl: string
  deviceToken: string
}

export function normalizePublicOrigin(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  try {
    return new URL(trimmed).origin
  } catch {
    return null
  }
}

export function assertValidPublicOrigin(origin: string): void {
  if (isProductionEnv()) {
    if (isLocalhostUrl(origin)) {
      throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
    }
    if (!origin.startsWith('https://')) {
      throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
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
    if (isProductionEnv() && isLocalhostUrl(candidate)) continue
    assertValidPublicOrigin(candidate)
    return candidate
  }

  if (isProductionEnv()) {
    throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
  }

  const devOrigin = candidates.find((candidate) => candidate != null)
  if (devOrigin) return devOrigin

  throw new Error(INVALID_GATEWAY_API_BASE_URL_MESSAGE)
}

export function resolveGatewayApiBaseUrl(origin: string): string {
  return resolveGatewayApiBaseUrlFromOrigin(origin)
}

export function buildGatewaySetupPayload(
  apiBaseUrl: string,
  deviceToken: string,
  overrides: Partial<GatewaySetupConfig> = {}
): GatewaySetupPayload {
  const canonicalUrl = normalizeGatewayApiBaseUrl(apiBaseUrl)
  const config = resolveGatewaySetupConfig(overrides)

  return {
    type: 'txtlink_gateway_setup',
    apiBaseUrl: canonicalUrl,
    deviceToken,
    ...config,
  }
}

export function encodeConnectionCode(payload: GatewaySetupPayload): string {
  const json = JSON.stringify(payload)
  const base64url = Buffer.from(json, 'utf8').toString('base64url')
  return `${CONNECTION_CODE_PREFIX}:${base64url}`
}

/** Decode without logging the token — for tests / repair only. */
export function decodeConnectionCode(code: string): GatewaySetupPayload {
  const prefix = `${CONNECTION_CODE_PREFIX}:`
  if (!code.startsWith(prefix)) {
    throw new Error('Invalid connection code prefix')
  }
  const json = Buffer.from(code.slice(prefix.length), 'base64url').toString('utf8')
  return JSON.parse(json) as GatewaySetupPayload
}

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

export function resolveGatewayApiBaseUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/sms-gateway`
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

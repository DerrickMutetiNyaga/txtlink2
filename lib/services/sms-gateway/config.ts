/**
 * Canonical SMS gateway configuration.
 * Single validated source for setup-string defaults and related limits.
 */

export const GATEWAY_API_PATH = '/api/sms-gateway'

export const GATEWAY_SETUP_DEFAULTS = {
  deviceName: 'TXTLINK Phone 1',
  pollIntervalSeconds: 10,
  smsDelaySeconds: 5,
  hourlyLimit: 100,
  dailyLimit: 500,
  pauseOnFailure: false,
  maxFailuresBeforePause: 5,
} as const

/** Old defaults that caused immediate pause on one temporary error. */
export const LEGACY_GATEWAY_SETUP_DEFAULTS = {
  pauseOnFailure: true,
  maxFailuresBeforePause: 1,
} as const

export type GatewaySetupConfig = {
  deviceName: string
  pollIntervalSeconds: number
  smsDelaySeconds: number
  hourlyLimit: number
  dailyLimit: number
  pauseOnFailure: boolean
  maxFailuresBeforePause: number
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

/**
 * Merge optional overrides onto canonical defaults and validate bounds.
 * Does not invent unsafe pause-on-first-failure defaults.
 */
export function resolveGatewaySetupConfig(
  overrides: Partial<GatewaySetupConfig> = {}
): GatewaySetupConfig {
  return {
    deviceName:
      typeof overrides.deviceName === 'string' && overrides.deviceName.trim()
        ? overrides.deviceName.trim().slice(0, 80)
        : GATEWAY_SETUP_DEFAULTS.deviceName,
    pollIntervalSeconds: clampInt(
      overrides.pollIntervalSeconds,
      GATEWAY_SETUP_DEFAULTS.pollIntervalSeconds,
      5,
      300
    ),
    smsDelaySeconds: clampInt(
      overrides.smsDelaySeconds,
      GATEWAY_SETUP_DEFAULTS.smsDelaySeconds,
      0,
      120
    ),
    hourlyLimit: clampInt(
      overrides.hourlyLimit,
      GATEWAY_SETUP_DEFAULTS.hourlyLimit,
      1,
      10_000
    ),
    dailyLimit: clampInt(
      overrides.dailyLimit,
      GATEWAY_SETUP_DEFAULTS.dailyLimit,
      1,
      100_000
    ),
    pauseOnFailure:
      typeof overrides.pauseOnFailure === 'boolean'
        ? overrides.pauseOnFailure
        : GATEWAY_SETUP_DEFAULTS.pauseOnFailure,
    maxFailuresBeforePause: clampInt(
      overrides.maxFailuresBeforePause,
      GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause,
      1,
      100
    ),
  }
}

export function isLegacyPauseDefault(config: {
  pauseOnFailure?: boolean | null
  maxFailuresBeforePause?: number | null
}): boolean {
  return (
    config.pauseOnFailure === LEGACY_GATEWAY_SETUP_DEFAULTS.pauseOnFailure &&
    config.maxFailuresBeforePause === LEGACY_GATEWAY_SETUP_DEFAULTS.maxFailuresBeforePause
  )
}

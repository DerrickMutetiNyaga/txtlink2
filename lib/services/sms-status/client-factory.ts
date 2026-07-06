/**
 * Builds a HostPinnacleStatusClient from SystemSettings (DB) with environment
 * variable fallback - the same precedence the send path uses.
 *
 * Kept separate from the client itself so the client stays free of database
 * imports and is trivially unit-testable.
 */

import { SystemSettings } from '@/lib/db/models'
import { HostPinnacleStatusClient } from '@/lib/services/hostpinnacle/status-client'
import { loadMasterHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import type { SmsStatusConfig } from '@/lib/config/sms-status-config'
import type { Logger } from '@/lib/worker/logger'

export async function createStatusClient(
  config: SmsStatusConfig,
  logger?: Logger
): Promise<HostPinnacleStatusClient> {
  let settings: Record<string, any> | null = null
  try {
    settings = await SystemSettings.findOne().lean()
  } catch (error) {
    logger?.warn('Failed to load SystemSettings; falling back to env vars', { error })
  }

  const masterCreds = await loadMasterHostPinnacleCredentials()

  return new HostPinnacleStatusClient(
    {
      baseUrl:
        settings?.hostpinnacleBaseUrl ||
        process.env.HOSTPINNACLE_BASE_URL ||
        'https://smsportal.hostpinnacle.co.ke',
      statusEndpoint:
        settings?.hostpinnacleStatusEndpoint ||
        process.env.HOSTPINNACLE_STATUS_ENDPOINT ||
        '/SMSApi/report/status',
      userId: masterCreds?.userId,
      password: masterCreds?.password,
      apiKey: masterCreds?.apiKey,
      timeoutMs: config.hostpinnacleTimeoutMs,
      maxRetries: config.maxRetries,
      rateLimitPerSecond: config.rateLimitPerSecond,
      circuitBreakerFailureThreshold: config.circuitBreakerFailureThreshold,
      circuitBreakerCooldownMs: config.circuitBreakerCooldownMs,
    },
    { logger }
  )
}

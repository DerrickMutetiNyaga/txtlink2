/**
 * Wires the SmsStatusSynchronizer with its dependencies.
 * Both the background worker and the admin manual-sync API route use this,
 * guaranteeing identical behavior everywhere.
 */

import { loadSmsStatusConfig, type SmsStatusConfig } from '@/lib/config/sms-status-config'
import { createLogger, type Logger } from '@/lib/worker/logger'
import { createStatusClient } from './client-factory'
import { RetryScheduler } from './retry-scheduler'
import { statusRepository } from './status-repository'
import { SmsStatusSynchronizer } from './synchronizer'

export interface BuiltSynchronizer {
  synchronizer: SmsStatusSynchronizer
  config: SmsStatusConfig
  logger: Logger
}

export async function buildSynchronizer(
  options: { loggerBindings?: Record<string, unknown> } = {}
): Promise<BuiltSynchronizer> {
  const config = loadSmsStatusConfig()
  const logger = createLogger(config.logLevel, {
    service: 'sms-status',
    workerId: config.workerId,
    ...options.loggerBindings,
  })

  const client = await createStatusClient(config, logger)
  const scheduler = new RetryScheduler({
    retryIntervalsSeconds: config.retryIntervalsSeconds,
    providerFinalTimeoutHours: config.providerFinalTimeoutHours,
  })

  const synchronizer = new SmsStatusSynchronizer({
    client,
    repository: statusRepository,
    scheduler,
    logger,
    workerConcurrency: config.workerConcurrency,
  })

  return { synchronizer, config, logger }
}

/**
 * Compute the initial nextCheckAt for a freshly-sent message using the same
 * configured retry schedule the worker uses. Send paths call this.
 */
export function initialNextCheckAt(now: Date = new Date()): Date {
  const config = loadSmsStatusConfig()
  const scheduler = new RetryScheduler({
    retryIntervalsSeconds: config.retryIntervalsSeconds,
    providerFinalTimeoutHours: config.providerFinalTimeoutHours,
  })
  return scheduler.initialNextCheckAt(now)
}

// Cached instance for API routes (DLR webhook, admin manual sync) so each
// request doesn't rebuild the client / re-read SystemSettings.
let cached: { built: BuiltSynchronizer; at: number } | null = null
const CACHE_TTL_MS = 60_000

export async function getSharedSynchronizer(): Promise<BuiltSynchronizer> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.built
  }
  const built = await buildSynchronizer({ loggerBindings: { component: 'web' } })
  cached = { built, at: Date.now() }
  return built
}

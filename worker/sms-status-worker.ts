/**
 * Render Background Worker entry point: SMS delivery-status synchronization.
 *
 * Run with: npm run worker:sms-status
 *
 * Runs independently of the Next.js web service. Continuously claims due
 * pending SMS messages, checks HostPinnacle for delivery status, updates
 * MongoDB, and reschedules the next check with smart backoff. Supports
 * multiple concurrent instances via lease-based work claiming, and shuts
 * down gracefully on SIGINT/SIGTERM.
 */

import 'dotenv/config'

async function main(): Promise<void> {
  // Imported dynamically so dotenv populates process.env before any module
  // reads it (lib/db/connect validates MONGODB_URI at import time).
  const { assertRequiredWorkerEnv } = await import('@/lib/config/sms-status-config')
  assertRequiredWorkerEnv()

  const { default: connectDB } = await import('@/lib/db/connect')
  const { buildSynchronizer } = await import('@/lib/services/sms-status/build-synchronizer')
  const { WorkerProcessor } = await import('@/lib/worker/processor')

  await connectDB()

  const { synchronizer, config, logger } = await buildSynchronizer({
    loggerBindings: { component: 'worker' },
  })

  const processor = new WorkerProcessor({ synchronizer, config, logger })

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info('shutdown signal received', { signal })
    processor.stop()

    // Give the current batch up to 30s to finish, then force-exit.
    setTimeout(() => {
      logger.warn('forced exit after shutdown grace period')
      process.exit(1)
    }, 30_000).unref()
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled rejection', { error: reason })
  })
  process.on('uncaughtException', (error) => {
    logger.error('uncaught exception', { error })
  })

  await processor.run()

  const mongoose = (await import('mongoose')).default
  await mongoose.disconnect().catch(() => {})
  process.exit(0)
}

main().catch((error) => {
  // Startup failures (bad env, unreachable DB) must be loud and fatal so
  // Render restarts the worker and the failure is visible in logs.
  console.error(JSON.stringify({ level: 'error', msg: 'worker failed to start', error: String(error?.stack || error) }))
  process.exit(1)
})

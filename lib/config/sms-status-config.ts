/**
 * SMS Status Worker Configuration
 *
 * All operational values come from environment variables and are validated
 * at startup. Never hardcode operational values elsewhere - import this.
 */

export interface SmsStatusConfig {
  /** Max messages claimed per worker cycle */
  batchSize: number
  /** Sleep between worker cycles when there is no work (ms) */
  pollIntervalMs: number
  /** How long a claimed message stays locked to one worker (seconds) */
  claimLeaseSeconds: number
  /** HostPinnacle HTTP request timeout (ms) */
  hostpinnacleTimeoutMs: number
  /** Max HTTP retries per status lookup (429/5xx/network) */
  maxRetries: number
  /** Backoff schedule for re-checking still-pending messages (seconds, indexed by attempt) */
  retryIntervalsSeconds: number[]
  /** Provider API rate limit (requests per second) */
  rateLimitPerSecond: number
  /** Concurrent status lookups inside one worker */
  workerConcurrency: number
  /** After this many hours without a final status, mark provider_timeout */
  providerFinalTimeoutHours: number
  /** Consecutive provider failures before the circuit opens */
  circuitBreakerFailureThreshold: number
  /** How long the circuit stays open before a probe is allowed (ms) */
  circuitBreakerCooldownMs: number
  /** Unique ID for this worker instance (lease ownership) */
  workerId: string
  /** Log level: debug | info | warn | error */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

const DEFAULT_RETRY_INTERVALS = [30, 120, 300, 900, 1800, 3600, 10800, 21600, 43200, 86400]

function intFromEnv(name: string, fallback: number, min = 1): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = parseInt(raw, 10)
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`Invalid ${name}="${raw}" - must be an integer >= ${min}`)
  }
  return value
}

function parseRetryIntervals(raw: string | undefined): number[] {
  if (!raw || raw.trim() === '') return DEFAULT_RETRY_INTERVALS
  const intervals = raw.split(',').map((part) => parseInt(part.trim(), 10))
  if (intervals.length === 0 || intervals.some((n) => !Number.isFinite(n) || n <= 0)) {
    throw new Error(
      `Invalid RETRY_INTERVALS_SECONDS="${raw}" - must be a comma-separated list of positive integers`
    )
  }
  return intervals
}

function parseLogLevel(raw: string | undefined): SmsStatusConfig['logLevel'] {
  const level = (raw || 'info').toLowerCase()
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level
  }
  throw new Error(`Invalid LOG_LEVEL="${raw}" - must be one of debug, info, warn, error`)
}

function defaultWorkerId(): string {
  const host = process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'worker'
  return `${host}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Load and validate the SMS status configuration from environment variables.
 * Throws with a descriptive message if any value is invalid.
 */
export function loadSmsStatusConfig(): SmsStatusConfig {
  return {
    batchSize: intFromEnv('BATCH_SIZE', 500),
    pollIntervalMs: intFromEnv('POLL_INTERVAL_MS', 5000, 100),
    claimLeaseSeconds: intFromEnv('CLAIM_LEASE_SECONDS', 120, 5),
    hostpinnacleTimeoutMs: intFromEnv('HOSTPINNACLE_TIMEOUT_MS', 10000, 1000),
    maxRetries: intFromEnv('MAX_RETRIES', 3, 0),
    retryIntervalsSeconds: parseRetryIntervals(process.env.RETRY_INTERVALS_SECONDS),
    rateLimitPerSecond: intFromEnv('RATE_LIMIT_PER_SECOND', 10),
    workerConcurrency: intFromEnv('WORKER_CONCURRENCY', 10),
    providerFinalTimeoutHours: intFromEnv('PROVIDER_FINAL_TIMEOUT_HOURS', 72),
    circuitBreakerFailureThreshold: intFromEnv('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 10),
    circuitBreakerCooldownMs: intFromEnv('CIRCUIT_BREAKER_COOLDOWN_MS', 60000, 1000),
    workerId: process.env.WORKER_ID?.trim() || defaultWorkerId(),
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
  }
}

/**
 * Validate environment variables that the worker cannot run without.
 * Call once at worker startup, before connecting to anything.
 */
export function assertRequiredWorkerEnv(): void {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required')
  }
}

import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SystemSettings, SmsMessage, WebhookLog } from '@/lib/db/models'
import { loadMasterHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { buildDlrWebhookUrlFromSettings } from '@/lib/services/hostpinnacle/dlr-webhook-url'
import { advancedSmsQueue } from '@/lib/services/sms/advanced-queue'

export type HealthStatus = 'operational' | 'degraded' | 'down' | 'not_configured'

export interface HealthCheck {
  id: string
  name: string
  category: 'core' | 'sms' | 'payments' | 'webhooks'
  status: HealthStatus
  message: string
  details?: Record<string, unknown>
}

export interface SystemHealthReport {
  overall: HealthStatus
  score: number
  summary: string
  checks: HealthCheck[]
  checkedAt: string
}

function scoreCheck(status: HealthStatus, optional = false): number {
  if (status === 'not_configured') return optional ? 100 : 0
  if (status === 'operational') return 100
  if (status === 'degraded') return 50
  return 0
}

function overallFromScore(score: number): HealthStatus {
  if (score >= 90) return 'operational'
  if (score >= 60) return 'degraded'
  return 'down'
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await connectDB()
    const state = mongoose.connection.readyState
    if (state === 1) {
      return {
        id: 'database',
        name: 'Database (MongoDB)',
        category: 'core',
        status: 'operational',
        message: 'Connected',
      }
    }
    return {
      id: 'database',
      name: 'Database (MongoDB)',
      category: 'core',
      status: 'down',
      message: `Not connected (state ${state})`,
    }
  } catch (e: unknown) {
    return {
      id: 'database',
      name: 'Database (MongoDB)',
      category: 'core',
      status: 'down',
      message: e instanceof Error ? e.message : 'Connection failed',
    }
  }
}

async function checkHostPinnacle(): Promise<HealthCheck> {
  const creds = await loadMasterHostPinnacleCredentials()
  if (!creds) {
    return {
      id: 'hostpinnacle',
      name: 'SMS Gateway (HostPinnacle)',
      category: 'sms',
      status: 'down',
      message: 'Credentials not configured in Settings',
    }
  }

  try {
    const result = await hostPinnacleClient.readSenderIds({
      options: {
        userId: creds.userId,
        password: creds.password,
        apiKey: creds.apiKey,
        timeout: 12000,
      },
    })

    if (result.success) {
      return {
        id: 'hostpinnacle',
        name: 'SMS Gateway (HostPinnacle)',
        category: 'sms',
        status: 'operational',
        message: 'API reachable and authenticated',
        details: { credentialSource: creds.source },
      }
    }

    return {
      id: 'hostpinnacle',
      name: 'SMS Gateway (HostPinnacle)',
      category: 'sms',
      status: 'degraded',
      message: result.error || result.message || 'API returned an error',
    }
  } catch (e: unknown) {
    return {
      id: 'hostpinnacle',
      name: 'SMS Gateway (HostPinnacle)',
      category: 'sms',
      status: 'down',
      message: e instanceof Error ? e.message : 'API check failed',
    }
  }
}

async function checkDlrWebhook(): Promise<HealthCheck> {
  try {
    const { dlrUrl, baseUrl, source } = await buildDlrWebhookUrlFromSettings()
    const probeUrl = dlrUrl.split('?')[0]

    const res = await fetch(probeUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'TXTLINK-HealthCheck/1.0' },
    })

    if (res.ok) {
      return {
        id: 'dlr_webhook',
        name: 'DLR Webhook Endpoint',
        category: 'webhooks',
        status: 'operational',
        message: 'Public DLR URL responds with HTTP 2xx',
        details: { baseUrl, source, dlrUrl, httpStatus: res.status },
      }
    }

    return {
      id: 'dlr_webhook',
      name: 'DLR Webhook Endpoint',
      category: 'webhooks',
      status: 'down',
      message: `DLR URL returned HTTP ${res.status}`,
      details: { baseUrl, dlrUrl },
    }
  } catch (e: unknown) {
    return {
      id: 'dlr_webhook',
      name: 'DLR Webhook Endpoint',
      category: 'webhooks',
      status: 'down',
      message: e instanceof Error ? e.message : 'Could not reach DLR URL',
    }
  }
}

async function checkDlrReceiving(): Promise<HealthCheck> {
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const [dlrCount, recentSms] = await Promise.all([
    WebhookLog.countDocuments({ provider: 'hostpinnacle', createdAt: { $gte: since48h } }),
    SmsMessage.countDocuments({
      createdAt: { $gte: since48h },
      status: { $in: ['sent', 'delivered', 'failed'] },
    }),
  ])

  if (recentSms === 0) {
    return {
      id: 'dlr_receiving',
      name: 'DLR Delivery (HostPinnacle → TXTLINK)',
      category: 'webhooks',
      status: 'operational',
      message: 'No recent SMS traffic to evaluate',
      details: { recentSms, dlrCount48h: dlrCount },
    }
  }

  if (dlrCount > 0) {
    return {
      id: 'dlr_receiving',
      name: 'DLR Delivery (HostPinnacle → TXTLINK)',
      category: 'webhooks',
      status: 'operational',
      message: `${dlrCount} DLR callback(s) received in the last 48 hours`,
      details: { recentSms, dlrCount48h: dlrCount },
    }
  }

  return {
    id: 'dlr_receiving',
    name: 'DLR Delivery (HostPinnacle → TXTLINK)',
    category: 'webhooks',
    status: 'degraded',
    message: `${recentSms} SMS sent recently but no DLR webhooks received — status polling is the backup`,
    details: { recentSms, dlrCount48h: dlrCount },
  }
}

async function checkDeliverySync(): Promise<HealthCheck> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000)
  const stuckCount = await SmsMessage.countDocuments({
    status: 'sent',
    createdAt: { $lt: fifteenMinAgo },
    $or: [
      { externalMsgId: { $exists: true, $nin: [null, ''] } },
      { hpTransactionId: { $exists: true, $nin: [null, ''] } },
    ],
  })

  if (stuckCount === 0) {
    return {
      id: 'delivery_sync',
      name: 'Delivery Status Sync',
      category: 'sms',
      status: 'operational',
      message: 'No messages stuck on Sent beyond 15 minutes',
      details: { stuckOnSent: stuckCount },
    }
  }

  if (stuckCount <= 5) {
    return {
      id: 'delivery_sync',
      name: 'Delivery Status Sync',
      category: 'sms',
      status: 'degraded',
      message: `${stuckCount} message(s) still on Sent after 15+ minutes`,
      details: { stuckOnSent: stuckCount },
    }
  }

  return {
    id: 'delivery_sync',
    name: 'Delivery Status Sync',
    category: 'sms',
    status: 'down',
    message: `${stuckCount} messages stuck on Sent — check HostPinnacle sync`,
    details: { stuckOnSent: stuckCount },
  }
}

function checkSmsQueue(): HealthCheck {
  const status = advancedSmsQueue.getStatus()
  const queued = status.totalQueued ?? 0

  if (!status.isRunning) {
    return {
      id: 'sms_queue',
      name: 'SMS Send Queue',
      category: 'sms',
      status: 'degraded',
      message: 'Queue processor is not running',
      details: { ...status },
    }
  }

  if (queued > 500) {
    return {
      id: 'sms_queue',
      name: 'SMS Send Queue',
      category: 'sms',
      status: 'degraded',
      message: `Large backlog: ${queued} messages queued`,
      details: { ...status },
    }
  }

  return {
    id: 'sms_queue',
    name: 'SMS Send Queue',
    category: 'sms',
    status: 'operational',
    message: queued === 0 ? 'Queue empty, processor running' : `${queued} message(s) in queue`,
    details: { ...status },
  }
}

async function checkMpesa(): Promise<HealthCheck> {
  const settings = await SystemSettings.findOne()
    .select('mpesaEnabled mpesaConsumerKey mpesaShortcode mpesaEnvironment')
    .lean()

  if (!settings?.mpesaEnabled) {
    return {
      id: 'mpesa',
      name: 'M-Pesa Payments',
      category: 'payments',
      status: 'not_configured',
      message: 'M-Pesa top-up is disabled',
    }
  }

  const hasCreds = !!(settings.mpesaConsumerKey && settings.mpesaShortcode)
  if (!hasCreds) {
    return {
      id: 'mpesa',
      name: 'M-Pesa Payments',
      category: 'payments',
      status: 'down',
      message: 'M-Pesa enabled but credentials incomplete',
      details: { environment: settings.mpesaEnvironment },
    }
  }

  return {
    id: 'mpesa',
    name: 'M-Pesa Payments',
    category: 'payments',
    status: 'operational',
    message: `Configured (${settings.mpesaEnvironment || 'sandbox'})`,
    details: { environment: settings.mpesaEnvironment, shortcode: settings.mpesaShortcode },
  }
}

async function checkPlatformSettings(): Promise<HealthCheck> {
  const settings = await SystemSettings.findOne()
    .select('smsSendingEnabled dlrWebhookBaseUrl environment')
    .lean()

  if (settings?.smsSendingEnabled === false) {
    return {
      id: 'platform',
      name: 'Platform Services',
      category: 'core',
      status: 'degraded',
      message: 'SMS sending is disabled in Settings',
    }
  }

  return {
    id: 'platform',
    name: 'Platform Services',
    category: 'core',
    status: 'operational',
    message: 'Application and API online',
    details: {
      environment: settings?.environment || 'production',
      dlrBaseUrl: settings?.dlrWebhookBaseUrl || process.env.NEXT_PUBLIC_BASE_URL,
    },
  }
}

/** Run all super-admin system health checks. */
export async function checkSystemHealth(): Promise<SystemHealthReport> {
  await connectDB()

  const checks = await Promise.all([
    checkDatabase(),
    checkPlatformSettings(),
    checkHostPinnacle(),
    checkSmsQueue(),
    checkDeliverySync(),
    checkDlrWebhook(),
    checkDlrReceiving(),
    checkMpesa(),
  ])

  const weights: Record<string, number> = {
    database: 15,
    platform: 10,
    hostpinnacle: 20,
    sms_queue: 10,
    delivery_sync: 15,
    dlr_webhook: 15,
    dlr_receiving: 10,
    mpesa: 5,
  }

  let totalWeight = 0
  let weightedScore = 0

  for (const check of checks) {
    const weight = weights[check.id] ?? 10
    const optional = check.status === 'not_configured'
    if (optional) continue
    totalWeight += weight
    weightedScore += (scoreCheck(check.status) * weight) / 100
  }

  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0
  const overall = overallFromScore(score)

  const downCount = checks.filter((c) => c.status === 'down').length
  const degradedCount = checks.filter((c) => c.status === 'degraded').length

  let summary = 'All systems operational'
  if (overall === 'degraded') {
    summary = `${degradedCount} component(s) degraded${downCount ? `, ${downCount} down` : ''}`
  } else if (overall === 'down') {
    summary = `${downCount} critical component(s) down`
  }

  return {
    overall,
    score,
    summary,
    checks,
    checkedAt: new Date().toISOString(),
  }
}

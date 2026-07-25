/**
 * Build the DLR webhook URL HostPinnacle should POST delivery reports to.
 */
import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'

export function buildDlrWebhookUrl(baseUrl?: string): { dlrUrl: string; hasSecret: boolean } {
  const root = (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
  if (!root) {
    throw new Error(
      'Public app URL is not set. Enter it in Super Admin → Settings or set NEXT_PUBLIC_BASE_URL.'
    )
  }

  const secret = process.env.WEBHOOK_SECRET
  const dlrUrl = secret
    ? `${root}/api/sms/dlr?secret=${encodeURIComponent(secret)}`
    : `${root}/api/sms/dlr`

  return { dlrUrl, hasSecret: Boolean(secret) }
}

/** Resolve public base URL: settings override → env fallback. */
export async function resolveDlrWebhookBaseUrl(): Promise<{
  baseUrl: string
  source: 'settings' | 'env'
}> {
  try {
    await connectDB()
    const settings = await SystemSettings.findOne().select('dlrWebhookBaseUrl').lean()
    const fromSettings = settings?.dlrWebhookBaseUrl?.trim().replace(/\/$/, '')
    if (fromSettings) {
      return { baseUrl: fromSettings, source: 'settings' }
    }
  } catch {
    // Fall through to env
  }

  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) {
    return { baseUrl: fromEnv, source: 'env' }
  }

  throw new Error(
    'Public app URL is not set. Enter it in Super Admin → Settings or set NEXT_PUBLIC_BASE_URL.'
  )
}

export async function buildDlrWebhookUrlFromSettings(baseUrlOverride?: string): Promise<{
  dlrUrl: string
  hasSecret: boolean
  baseUrl: string
  source: 'override' | 'settings' | 'env'
}> {
  const override = baseUrlOverride?.trim().replace(/\/$/, '')
  if (override) {
    const { dlrUrl, hasSecret } = buildDlrWebhookUrl(override)
    return { dlrUrl, hasSecret, baseUrl: override, source: 'override' }
  }

  const { baseUrl, source } = await resolveDlrWebhookBaseUrl()
  const { dlrUrl, hasSecret } = buildDlrWebhookUrl(baseUrl)
  return { dlrUrl, hasSecret, baseUrl, source }
}

/** Persist the public app URL used for DLR webhooks. */
export async function persistDlrWebhookBaseUrl(baseUrl: string): Promise<void> {
  const normalized = baseUrl.trim().replace(/\/$/, '')
  if (!normalized) return

  await connectDB()
  const settings = await SystemSettings.findOne()
  if (!settings) return

  settings.dlrWebhookBaseUrl = normalized
  await settings.save()
}

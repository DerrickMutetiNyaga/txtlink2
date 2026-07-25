import connectDB from '@/lib/db/connect'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { loadMasterHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import {
  buildDlrWebhookUrlFromSettings,
  persistDlrWebhookBaseUrl,
} from '@/lib/services/hostpinnacle/dlr-webhook-url'

export interface RegisterDlrWebhookOptions {
  /** Use this base URL instead of saved/env value (e.g. from the settings form). */
  baseUrl?: string
  /** Save baseUrl to SystemSettings before registering. Default true when baseUrl is provided. */
  persistBaseUrl?: boolean
}

export interface RegisterDlrWebhookResult {
  success: boolean
  dlrUrl: string
  hasSecret: boolean
  baseUrl?: string
  message?: string
  error?: string
}

/**
 * Register (or re-register) the DLR webhook URL with HostPinnacle.
 * Safe to run multiple times — overwrites the previous webhook URL on their side.
 */
export async function registerDlrWebhook(
  options: RegisterDlrWebhookOptions = {}
): Promise<RegisterDlrWebhookResult> {
  const baseUrlOverride = options.baseUrl?.trim().replace(/\/$/, '')

  if (baseUrlOverride && options.persistBaseUrl !== false) {
    await persistDlrWebhookBaseUrl(baseUrlOverride)
  }

  const { dlrUrl, hasSecret, baseUrl } = await buildDlrWebhookUrlFromSettings(baseUrlOverride)

  await connectDB()
  const creds = await loadMasterHostPinnacleCredentials()
  if (!creds?.userId && !creds?.apiKey) {
    return {
      success: false,
      dlrUrl,
      hasSecret,
      baseUrl,
      error: 'HostPinnacle credentials not configured. Set them in Super Admin → Settings.',
    }
  }

  const result = await hostPinnacleClient.registerWebhook({
    smsWebhook: dlrUrl,
    smsWebhookRate: 10,
    options: {
      userId: creds.userId,
      password: creds.password,
      apiKey: creds.apiKey,
    },
  })

  if (!result.success) {
    return {
      success: false,
      dlrUrl,
      hasSecret,
      baseUrl,
      error: result.error || result.message || 'HostPinnacle webhook registration failed',
      message: result.message,
    }
  }

  return {
    success: true,
    dlrUrl,
    hasSecret,
    baseUrl,
    message:
      result.action === 'update'
        ? 'DLR webhook updated with HostPinnacle.'
        : result.message || 'DLR webhook registered with HostPinnacle.',
  }
}

import connectDB from '@/lib/db/connect'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { loadMasterHostPinnacleCredentials } from '@/lib/services/hostpinnacle/credentials'
import { buildDlrWebhookUrl } from '@/lib/services/hostpinnacle/dlr-webhook-url'

export interface RegisterDlrWebhookResult {
  success: boolean
  dlrUrl: string
  hasSecret: boolean
  message?: string
  error?: string
}

/**
 * Register (or re-register) the DLR webhook URL with HostPinnacle.
 * Safe to run multiple times — overwrites the previous webhook URL on their side.
 */
export async function registerDlrWebhook(): Promise<RegisterDlrWebhookResult> {
  const { dlrUrl, hasSecret } = buildDlrWebhookUrl()

  await connectDB()
  const creds = await loadMasterHostPinnacleCredentials()
  if (!creds?.userId && !creds?.apiKey) {
    return {
      success: false,
      dlrUrl,
      hasSecret,
      error: 'HostPinnacle credentials not configured. Set them in Super Admin → Settings.',
    }
  }

  const result = await hostPinnacleClient.createWebhook({
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
      error: result.error || result.message || 'HostPinnacle webhook registration failed',
      message: result.message,
    }
  }

  return {
    success: true,
    dlrUrl,
    hasSecret,
    message: result.message || 'DLR webhook registered with HostPinnacle.',
  }
}

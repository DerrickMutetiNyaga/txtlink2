/**
 * Build the DLR webhook URL HostPinnacle should POST delivery reports to.
 */
export function buildDlrWebhookUrl(baseUrl?: string): { dlrUrl: string; hasSecret: boolean } {
  const root = (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
  if (!root) {
    throw new Error(
      'NEXT_PUBLIC_BASE_URL is not set. Set it to your app URL (e.g. https://txtlink.co.ke).'
    )
  }

  const secret = process.env.WEBHOOK_SECRET
  const dlrUrl = secret
    ? `${root}/api/sms/dlr?secret=${encodeURIComponent(secret)}`
    : `${root}/api/sms/dlr`

  return { dlrUrl, hasSecret: Boolean(secret) }
}

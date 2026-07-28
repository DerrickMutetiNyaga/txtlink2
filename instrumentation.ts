/**
 * Next.js instrumentation — runs once when the Node server boots after deploy.
 * Auto-resends SMS that failed during HostPinnacle 503 outages.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Defer so boot is not blocked; only run in production / when explicitly enabled
  const enabled =
    process.env.AUTO_RESEND_PROVIDER_OUTAGES !== '0' &&
    (process.env.NODE_ENV === 'production' || process.env.AUTO_RESEND_PROVIDER_OUTAGES === '1')

  if (!enabled) return

  setTimeout(() => {
    void (async () => {
      try {
        const { resendProviderOutageFailures } = await import(
          '@/lib/services/sms/resend-provider-outages'
        )
        const result = await resendProviderOutageFailures(150)
        if (result.claimed > 0) {
          console.log('[instrumentation] provider outage auto-resend:', result)
        }
      } catch (err) {
        console.error('[instrumentation] provider outage auto-resend failed:', err)
      }
    })()
  }, 8000)
}

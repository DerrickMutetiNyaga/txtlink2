/**
 * Safaricom C2B/STK callbacks must hit the final URL.
 * www.txtlink.co.ke 301s to txtlink.co.ke — M-Pesa does not POST through that redirect.
 */
export function canonicalMpesaCallbackUrl(url?: string | null): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    if (parsed.hostname.toLowerCase() === 'www.txtlink.co.ke') {
      parsed.hostname = 'txtlink.co.ke'
    }
    parsed.hash = ''
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}${parsed.search}`
  } catch {
    return trimmed.replace(/www\.txtlink\.co\.ke/gi, 'txtlink.co.ke').replace(/\/+$/, '')
  }
}

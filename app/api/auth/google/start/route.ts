import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`.replace(/\/+$/, '')

  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (env) return env.replace(/\/+$/, '')

  throw new Error('Unable to determine base URL')
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID' }, { status: 500 })
  }

  const baseUrl = getBaseUrl(req)
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('prompt', 'select_account')

  const intent = req.nextUrl.searchParams.get('intent') || 'login'
  const statePayload = JSON.stringify({
    intent,
    nonce: crypto.randomBytes(16).toString('hex'),
    t: Date.now(),
  })
  const state = Buffer.from(statePayload).toString('base64url')
  url.searchParams.set('state', state)

  const res = NextResponse.redirect(url.toString())
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: baseUrl.startsWith('https://'),
    path: '/',
    maxAge: 10 * 60, // 10 min
  })

  return res
}


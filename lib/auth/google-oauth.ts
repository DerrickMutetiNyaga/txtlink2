import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import type { IUser } from '@/lib/db/models'

export type GoogleUserInfo = {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

export function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`.replace(/\/+$/, '')

  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (env) return env.replace(/\/+$/, '')

  throw new Error('Unable to determine base URL')
}

export function getGoogleRedirectUri(req: NextRequest): string {
  const envRedirect = process.env.GOOGLE_REDIRECT_URI?.trim()
  if (envRedirect) return envRedirect.replace(/\/+$/, '')

  const baseUrl = getBaseUrl(req)
  return `${baseUrl}/api/auth/google/callback`
}

export function resolveIsOwner(email: string, userId: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL?.trim()?.toLowerCase()
  const ownerUserId = process.env.OWNER_USER_ID?.trim()
  const emailLower = email.toLowerCase().trim()

  return (
    (!!ownerEmail && emailLower === ownerEmail) ||
    (!!ownerUserId && userId === ownerUserId)
  )
}

export function createSessionToken(user: Pick<IUser, 'email' | 'role'> & { _id: { toString(): string } }): string {
  const jwtSecret = process.env.JWT_SECRET?.trim()
  if (!jwtSecret) throw new Error('Missing JWT_SECRET')

  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: '7d' }
  )
}

export function buildAuthUserPayload(
  user: Pick<IUser, 'name' | 'email' | 'role' | 'credits'> & { _id: { toString(): string } },
  isOwner: boolean
) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    credits: user.credits,
    isOwner,
  }
}

export function loginRedirectUrl(baseUrl: string, errorCode: string): string {
  const url = new URL('/auth/login', baseUrl)
  url.searchParams.set('error', errorCode)
  return url.toString()
}

export async function exchangeCodeForTokens(params: {
  code: string
  redirectUri: string
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) throw new Error('Missing Google OAuth env vars')

  const body = new URLSearchParams()
  body.set('code', params.code)
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('redirect_uri', params.redirectUri)
  body.set('grant_type', 'authorization_code')

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const json = await resp.json()
  if (!resp.ok) {
    throw new Error(json?.error_description || json?.error || 'Failed to exchange code')
  }

  return json as { access_token: string; id_token?: string; expires_in?: number; token_type?: string }
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await resp.json()
  if (!resp.ok) throw new Error(json?.error_description || 'Failed to fetch userinfo')
  return json as GoogleUserInfo
}

export function validateGoogleUserInfo(userInfo: GoogleUserInfo): { ok: true; email: string; googleId: string } | { ok: false; error: string } {
  const googleId = userInfo.sub?.trim()
  if (!googleId) {
    return { ok: false, error: 'google_oauth_failed' }
  }

  const email = userInfo.email?.toLowerCase().trim()
  if (!email) {
    return { ok: false, error: 'google_oauth_no_email' }
  }

  if (!userInfo.email_verified) {
    return { ok: false, error: 'google_oauth_unverified_email' }
  }

  return { ok: true, email, googleId }
}

export function buildAuthProvidersUpdate(
  existingProviders: string[] | undefined,
  hasPassword: boolean
): string[] {
  const providers = new Set(existingProviders || [])
  if (hasPassword) providers.add('password')
  providers.add('google')
  return Array.from(providers)
}

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

type GoogleUserInfo = {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

async function exchangeCodeForTokens(params: {
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

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await resp.json()
  if (!resp.ok) throw new Error(json?.error_description || 'Failed to fetch userinfo')
  return json as GoogleUserInfo
}

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`.replace(/\/+$/, '')

  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (env) return env.replace(/\/+$/, '')

  throw new Error('Unable to determine base URL')
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect('/auth/login?error=google_oauth_missing_code')
    }

    const stateCookie = req.cookies.get('google_oauth_state')?.value
    if (!stateCookie || stateCookie !== state) {
      return NextResponse.redirect('/auth/login?error=google_oauth_invalid_state')
    }

    const baseUrl = getBaseUrl(req)
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    const tokens = await exchangeCodeForTokens({ code, redirectUri })
    const userInfo = await fetchGoogleUserInfo(tokens.access_token)

    const email = userInfo.email?.toLowerCase().trim()
    if (!email) {
      return NextResponse.redirect('/auth/login?error=google_oauth_no_email')
    }

    await connectDB()

    let user = await User.findOne({ email })

    if (!user) {
      const randomPassword = `${email}:${Date.now()}:${Math.random()}`
      const passwordHash = await bcrypt.hash(randomPassword, 10)

      user = await User.create({
        name: userInfo.name || email.split('@')[0],
        email,
        passwordHash,
        role: 'user',
        credits: 0,
        creditsBalance: 0,
        isActive: true,
      })
    } else if (!user.isActive) {
      return NextResponse.redirect('/auth/login?error=account_deactivated')
    }

    const JWT_SECRET = process.env.JWT_SECRET?.trim()
    if (!JWT_SECRET) throw new Error('Missing JWT_SECRET')

    const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim()?.toLowerCase()
    const OWNER_USER_ID = process.env.OWNER_USER_ID?.trim()
    const isOwner =
      (!!OWNER_EMAIL && email === OWNER_EMAIL) ||
      (!!OWNER_USER_ID && user._id.toString() === OWNER_USER_ID)

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      isOwner,
    }

    const callbackUrl = new URL(`${baseUrl}/auth/oauth-callback`)
    callbackUrl.searchParams.set('token', token)
    callbackUrl.searchParams.set('user', Buffer.from(JSON.stringify(userPayload)).toString('base64url'))

    const res = NextResponse.redirect(callbackUrl.toString())
    res.cookies.delete('google_oauth_state')
    return res
  } catch (err: any) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect('/auth/login?error=google_oauth_failed')
  }
}


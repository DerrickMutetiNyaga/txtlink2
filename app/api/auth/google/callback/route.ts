import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import {
  buildAuthProvidersUpdate,
  buildAuthUserPayload,
  createSessionToken,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getBaseUrl,
  getGoogleRedirectUri,
  loginRedirectUrl,
  resolveIsOwner,
  validateGoogleUserInfo,
} from '@/lib/auth/google-oauth'

export async function GET(req: NextRequest) {
  let baseUrl = ''

  try {
    baseUrl = getBaseUrl(req)

    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(loginRedirectUrl(baseUrl, 'google_oauth_missing_code'))
    }

    const stateCookie = req.cookies.get('google_oauth_state')?.value
    if (!stateCookie || stateCookie !== state) {
      return NextResponse.redirect(loginRedirectUrl(baseUrl, 'google_oauth_invalid_state'))
    }

    const redirectUri = getGoogleRedirectUri(req)
    const tokens = await exchangeCodeForTokens({ code, redirectUri })
    const userInfo = await fetchGoogleUserInfo(tokens.access_token)

    const validation = validateGoogleUserInfo(userInfo)
    if (!validation.ok) {
      return NextResponse.redirect(loginRedirectUrl(baseUrl, validation.error))
    }

    const { email, googleId } = validation

    await connectDB()

    let user = await User.findOne({ email })

    if (user) {
      if (!user.isActive) {
        return NextResponse.redirect(loginRedirectUrl(baseUrl, 'account_deactivated'))
      }

      const updates: Record<string, unknown> = {
        lastLoginAt: new Date(),
        emailVerified: true,
        authProviders: buildAuthProvidersUpdate(user.authProviders, !!user.passwordHash),
      }

      if (!user.googleId) {
        updates.googleId = googleId
      }

      if (userInfo.picture && !user.avatarUrl) {
        updates.avatarUrl = userInfo.picture
      }

      user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true })
      if (!user) {
        return NextResponse.redirect(loginRedirectUrl(baseUrl, 'google_oauth_failed'))
      }
    } else {
      try {
        user = await User.create({
          name: userInfo.name?.trim() || email.split('@')[0],
          email,
          role: 'user',
          credits: 0,
          creditsBalance: 0,
          isActive: true,
          googleId,
          authProviders: ['google'],
          emailVerified: true,
          avatarUrl: userInfo.picture || undefined,
          provider: 'google',
          lastLoginAt: new Date(),
        })
      } catch (createErr) {
        console.error('Google OAuth user creation error:', createErr)
        return NextResponse.redirect(loginRedirectUrl(baseUrl, 'account_creation_failed'))
      }
    }

    const isOwner = resolveIsOwner(email, user._id.toString())
    const token = createSessionToken(user)
    const userPayload = buildAuthUserPayload(user, isOwner)

    const callbackUrl = new URL('/auth/oauth-callback', baseUrl)
    callbackUrl.searchParams.set('token', token)
    callbackUrl.searchParams.set(
      'user',
      Buffer.from(JSON.stringify(userPayload)).toString('base64url')
    )

    const res = NextResponse.redirect(callbackUrl.toString())
    res.cookies.delete('google_oauth_state')
    return res
  } catch (err: unknown) {
    console.error('Google OAuth callback error:', err)
    const fallbackBase = baseUrl || process.env.NEXT_PUBLIC_BASE_URL?.trim() || 'http://localhost:3000'
    return NextResponse.redirect(loginRedirectUrl(fallbackBase, 'google_oauth_failed'))
  }
}

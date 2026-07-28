/**
 * Provisioning Register API
 * POST /api/v1/register
 *
 * Accepts username + email, creates an account with a generated password,
 * and returns credentials plus the dashboard URL once.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import { getBaseUrl } from '@/lib/auth/google-oauth'
import { assignSignupDefaultSenderId } from '@/lib/services/senderids/signup-default'
import { parseSmsSendRequest } from '@/lib/utils/parse-sms-send-body'

/**
 * Accept JSON, form-urlencoded, multipart, or query-string payloads so any
 * integration platform can call this endpoint without strict JSON formatting.
 */
async function parseRegisterBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase()

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const out: Record<string, unknown> = {}
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') out[key] = value
    }
    return out
  }

  return parseSmsSendRequest(request)
}

function generatePassword(length = 16): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  const bytes = crypto.randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += alphabet[bytes[i] % alphabet.length]
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    const provisionKey = process.env.PROVISION_API_KEY?.trim()
    if (provisionKey) {
      const headerKey =
        request.headers.get('x-api-key')?.trim() ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
      if (!headerKey || headerKey !== provisionKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    await connectDB()

    let body: Record<string, unknown>
    try {
      body = await parseRegisterBody(request)
    } catch {
      return NextResponse.json(
        {
          error:
            'Invalid payload format. Send JSON {"username":"...","email":"..."} with Content-Type: application/json, or form fields username and email.',
        },
        { status: 400 }
      )
    }

    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!username || !email) {
      return NextResponse.json(
        { error: 'username and email are required' },
        { status: 400 }
      )
    }

    if (username.length < 2 || username.length > 80) {
      return NextResponse.json(
        { error: 'username must be between 2 and 80 characters' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const password = generatePassword()
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      name: username,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
      credits: 0,
      creditsBalance: 0,
      isActive: true,
      authProviders: ['password'],
      emailVerified: false,
    })

    await assignSignupDefaultSenderId(user._id.toString())

    let baseUrl: string
    try {
      baseUrl = getBaseUrl(request)
    } catch {
      baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ||
        'http://localhost:3000'
    }

    const dashboardUrl = `${baseUrl}/app/dashboard`

    return NextResponse.json({
      success: true,
      username,
      password,
      dashboardUrl,
      email: user.email,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Provision register error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}

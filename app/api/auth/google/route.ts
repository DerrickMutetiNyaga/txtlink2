import { NextRequest, NextResponse } from 'next/server'

/** Alias for /api/auth/google/start — starts Google OAuth flow */
export async function GET(req: NextRequest) {
  const intent = req.nextUrl.searchParams.get('intent') || 'login'
  const url = new URL('/api/auth/google/start', req.url)
  url.searchParams.set('intent', intent)
  return NextResponse.redirect(url)
}

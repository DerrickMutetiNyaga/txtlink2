import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { getCronSecret } from '@/lib/services/sms-fallback/config'
import { runSmsFallbackScan } from '@/lib/services/sms-fallback/scanner'

function authorizeCron(request: NextRequest): boolean {
  const secret = getCronSecret()
  if (!secret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') === secret) return true

  return false
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const result = await runSmsFallbackScan()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('SMS fallback scan error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

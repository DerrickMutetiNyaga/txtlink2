import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsFallbackJob } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)

    const result = await SmsFallbackJob.deleteMany({
      userId,
      isTest: true,
      status: { $in: ['sent', 'failed', 'cancelled'] },
    })

    return NextResponse.json({
      success: true,
      message: `Removed ${result.deletedCount} completed test job(s).`,
      deletedCount: result.deletedCount,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Clear completed test jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

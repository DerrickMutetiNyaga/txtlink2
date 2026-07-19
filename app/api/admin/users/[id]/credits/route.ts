/**
 * Admin: Manually add or remove SMS credits for a user
 * POST /api/admin/users/[id]/credits
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { requireAdmin } from '@/lib/auth/middleware'
import { adjustUserCredits } from '@/lib/services/credits/adjust-balance'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    const admin = requireAdmin(request)
    const { id: userId } = await Promise.resolve(params)

    const { action, credits, amount, reason } = await request.json()
    const creditAmount = Math.trunc(Number(credits ?? amount))

    if (!action || !['add', 'remove', 'add_credits', 'remove_credits'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "add" or "remove"' },
        { status: 400 }
      )
    }

    if (!creditAmount || creditAmount <= 0) {
      return NextResponse.json(
        { error: 'credits must be a positive number' },
        { status: 400 }
      )
    }

    const isAdd = action === 'add' || action === 'add_credits'
    const result = await adjustUserCredits({
      userId,
      creditsDelta: isAdd ? creditAmount : -creditAmount,
      reason,
      adjustedBy: { userId: admin.userId, email: admin.email },
      source: 'admin',
    })

    return NextResponse.json({
      success: true,
      ...result,
      newBalance: result.newBalance,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    if (error.message === 'User not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (
      error.message.includes('Cannot remove') ||
      error.message.includes('must be')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Admin adjust credits error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

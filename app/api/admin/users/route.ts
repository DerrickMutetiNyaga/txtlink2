/**
 * Admin: Get All Users
 * GET /api/admin/users
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { User, HostPinnacleAccount, UserSenderId, SenderId } from '@/lib/db/models'
import { requireAdmin } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireAdmin(request)

    const users = await User.find({}).sort({ createdAt: -1 })

    // Get HostPinnacle accounts and sender IDs for each user
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const hpAccount = await HostPinnacleAccount.findOne({ userId: user._id })
        const userSenderIds = await UserSenderId.find({ userId: user._id })
          .populate('senderId')
          .sort({ isDefault: -1 })

        const senderIds = userSenderIds.map((usi) => {
          const sid = usi.senderId as any
          return {
            id: sid._id,
            senderName: sid.senderName,
            status: sid.status,
            isDefault: usi.isDefault,
          }
        })

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          credits: user.credits,
          isActive: user.isActive,
          hpUserLoginName: hpAccount?.hpUserLoginName || null,
          senderIds,
          createdAt: user.createdAt,
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithDetails,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Forbidden') ? 403 : 401 })
    }
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


/**
 * Super Admin: manage who can access the super-admin portal
 * GET  /api/super-admin/super-admins?q=
 * POST /api/super-admin/super-admins  { userId }
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { isEnvOwner } from '@/lib/auth/owner'
import { logAudit } from '@/lib/utils/audit'

function serializeAdmin(user: {
  _id: { toString(): string }
  name: string
  email: string
  isActive?: boolean
  isSuperAdmin?: boolean
  createdAt?: Date
}) {
  const id = user._id.toString()
  const root = isEnvOwner(user.email, id)
  return {
    id,
    name: user.name,
    email: user.email,
    isActive: user.isActive !== false,
    isRootOwner: root,
    isSuperAdmin: !!user.isSuperAdmin || root,
    createdAt: user.createdAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const actor = await requireOwner(request)

    const q = request.nextUrl.searchParams.get('q')?.trim() || ''

    const flagged = await User.find({ isSuperAdmin: true })
      .select('name email isActive isSuperAdmin createdAt')
      .sort({ name: 1 })
      .lean()

    const byId = new Map(flagged.map((u) => [u._id.toString(), u]))

    const ownerEmail = process.env.OWNER_EMAIL?.trim()?.toLowerCase()
    const ownerUserId = process.env.OWNER_USER_ID?.trim()
    if (ownerEmail || ownerUserId) {
      const rootQuery: Record<string, unknown>[] = []
      if (ownerEmail) rootQuery.push({ email: ownerEmail })
      if (ownerUserId && mongoose.Types.ObjectId.isValid(ownerUserId)) {
        rootQuery.push({ _id: new mongoose.Types.ObjectId(ownerUserId) })
      }
      if (rootQuery.length) {
        const rootUsers = await User.find({ $or: rootQuery })
          .select('name email isActive isSuperAdmin createdAt')
          .lean()
        for (const u of rootUsers) {
          byId.set(u._id.toString(), u)
        }
      }
    }

    const superAdmins = Array.from(byId.values()).map(serializeAdmin)

    let candidates: ReturnType<typeof serializeAdmin>[] = []
    if (q.length >= 2) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const users = await User.find({
        $or: [
          { email: { $regex: escaped, $options: 'i' } },
          { name: { $regex: escaped, $options: 'i' } },
        ],
      })
        .select('name email isActive isSuperAdmin createdAt')
        .limit(20)
        .lean()

      const existingIds = new Set(superAdmins.map((s) => s.id))
      candidates = users
        .filter((u) => !existingIds.has(u._id.toString()) && !isEnvOwner(u.email, u._id.toString()))
        .map(serializeAdmin)
    }

    return NextResponse.json({
      success: true,
      data: {
        currentUserId: actor.userId,
        superAdmins,
        candidates,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('List super admins error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const actor = await requireOwner(request)
    const { userId } = await request.json()

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'A valid userId is required' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isSuperAdmin || isEnvOwner(user.email, user._id.toString())) {
      return NextResponse.json({ error: 'This user is already a super admin' }, { status: 400 })
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'Activate the account before approving it as super admin' }, { status: 400 })
    }

    user.isSuperAdmin = true
    user.role = 'admin'
    await user.save()

    await logAudit('APPROVE_SUPER_ADMIN', 'user', actor.userId, actor.email, {
      resourceId: userId,
      changes: { isSuperAdmin: { before: false, after: true }, email: user.email },
      request,
    })

    return NextResponse.json({
      success: true,
      data: serializeAdmin(user),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Approve super admin error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

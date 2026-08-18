/**
 * Super-admin / owner access helpers.
 * Root owner = OWNER_EMAIL / OWNER_USER_ID env. Additional super admins are stored on User.isSuperAdmin.
 */

import connectDB from '@/lib/db/connect'
import { User } from '@/lib/db/models'

export function isEnvOwner(email?: string, userId?: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL?.trim()?.toLowerCase()
  const ownerUserId = process.env.OWNER_USER_ID?.trim()
  if (!ownerEmail && !ownerUserId) return false

  if (email && ownerEmail && email.toLowerCase().trim() === ownerEmail) return true
  if (userId && ownerUserId && userId === ownerUserId) return true
  return false
}

export async function hasSuperAdminAccess(email: string, userId: string): Promise<boolean> {
  if (isEnvOwner(email, userId)) return true

  await connectDB()
  const user = await User.findById(userId).select('isSuperAdmin isActive').lean()
  return !!(user && user.isActive !== false && user.isSuperAdmin)
}

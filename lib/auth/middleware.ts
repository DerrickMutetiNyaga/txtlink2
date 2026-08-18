/**
 * Authentication Middleware
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Validated lazily (on first use) so `next build` can compile without secrets.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables')
  }
  return secret
}

export interface AuthUser {
  userId: string
  email: string
  role: 'admin' | 'user'
}

/**
 * Verify JWT token from request
 */
export function verifyAuth(request: NextRequest): AuthUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Require authentication - returns user or throws error
 */
export function requireAuth(request: NextRequest): AuthUser {
  const user = verifyAuth(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require admin role
 */
export function requireAdmin(request: NextRequest): AuthUser {
  const user = requireAuth(request)
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}

/**
 * Require super-admin access (env owner or a user approved as super admin)
 */
export async function requireOwner(request: NextRequest): Promise<AuthUser> {
  const user = requireAuth(request)
  const { hasSuperAdminAccess } = await import('@/lib/auth/owner')
  const allowed = await hasSuperAdminAccess(user.email, user.userId)
  if (!allowed) {
    throw new Error('Forbidden: Owner access required')
  }
  return user
}


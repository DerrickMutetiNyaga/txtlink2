/**
 * Authentication Middleware
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables')
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

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
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
 * Require owner access (strict - only owner email or userId)
 */
export function requireOwner(request: NextRequest): AuthUser {
  const user = requireAuth(request)
  
  const OWNER_EMAIL = process.env.OWNER_EMAIL
  const OWNER_USER_ID = process.env.OWNER_USER_ID
  
  if (!OWNER_EMAIL && !OWNER_USER_ID) {
    throw new Error('OWNER_EMAIL or OWNER_USER_ID must be set in environment variables')
  }
  
  const isOwner = 
    (OWNER_EMAIL && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) ||
    (OWNER_USER_ID && user.userId === OWNER_USER_ID)
  
  if (!isOwner) {
    throw new Error('Forbidden: Owner access required')
  }
  
  return user
}


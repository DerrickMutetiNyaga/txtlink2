'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { logoutAndRedirect } from '@/lib/utils/auth'

/**
 * Hook to check authentication status and redirect if invalid
 */
export function useAuth(redirectOnInvalid = true) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      setIsAuthenticated(false)
      if (redirectOnInvalid && pathname && !pathname.startsWith('/auth/')) {
        logoutAndRedirect()
      }
      return
    }

    setIsAuthenticated(true)
  }, [pathname, redirectOnInvalid])

  return { isAuthenticated }
}

/**
 * Hook to handle API responses and redirect on 401
 */
export function useAuthRedirect() {
  const handleResponse = (response: Response): boolean => {
    if (response.status === 401) {
      logoutAndRedirect()
      return true
    }
    return false
  }

  return { handleResponse }
}


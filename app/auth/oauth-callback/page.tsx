'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type UserPayload = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  credits?: number
  isOwner?: boolean
}

function decodeUser(userB64: string | null): UserPayload | null {
  if (!userB64) return null
  try {
    const json = atob(userB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export default function OAuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const params = useMemo(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search)
  }, [])

  useEffect(() => {
    if (!params) return

    const token = params.get('token')
    const user = decodeUser(params.get('user'))

    if (!token || !user) {
      setError('Failed to complete sign-in. Please try again.')
      return
    }

    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('isAuthenticated', 'true')

    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin')
    if (redirectAfterLogin) {
      localStorage.removeItem('redirectAfterLogin')
      router.replace(redirectAfterLogin)
      return
    }

    if (user.isOwner) {
      window.location.href = '/super-admin'
      return
    }

    if (user.role === 'admin') {
      router.replace('/admin/users')
      return
    }

    router.replace('/app/dashboard')
  }, [params, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign-in failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/auth/login" className="text-emerald-700 font-semibold hover:underline">
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-gray-700">Completing sign-in…</div>
    </div>
  )
}


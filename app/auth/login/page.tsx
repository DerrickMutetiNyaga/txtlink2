'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { SocialButton } from '@/components/auth/social-button'
import { Divider } from '@/components/auth/divider'
import { BrandPanel } from '@/components/auth/brand-panel'
import { MobileBrandHeader } from '@/components/auth/mobile-brand-header'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token and user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isAuthenticated', 'true')
        
        // Check if there's a redirect destination
        const redirectAfterLogin = localStorage.getItem('redirectAfterLogin')
        
        if (redirectAfterLogin) {
          localStorage.removeItem('redirectAfterLogin')
          router.push(redirectAfterLogin)
        } else {
          // Redirect based on user type
          if (data.user.isOwner) {
            window.location.href = '/super-admin'
          } else if (data.user.role === 'admin') {
            router.push('/admin/users')
          } else {
            router.push('/app/dashboard')
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider: 'google') => {
    if (provider === 'google') {
      window.location.href = '/api/auth/google/start?intent=login'
      return
    }
  }

  const features = [
    '99.9% uptime SLA with carrier-grade infrastructure',
    'Enterprise security with end-to-end encryption',
    'Real-time delivery tracking and analytics',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 flex">
      {/* Desktop: Two Column Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 w-full">
        {/* Left: Brand Panel */}
        <div className="relative">
          <BrandPanel features={features} />
        </div>

        {/* Right: Auth Card */}
        <div className="flex items-center justify-center p-8 xl:p-12">
          <div className="w-full max-w-md">
            <Card className="p-8 sm:p-10 border border-gray-200 rounded-3xl shadow-lg bg-white">
              {/* Header */}
              <div className="mb-8">
                <Link href="/" className="inline-block mb-6">
                  <span className="text-2xl font-bold text-emerald-600">TXTLink</span>
                </Link>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  Welcome back
                </h1>
                <p className="text-gray-600">
                  Sign in to your account to continue
                </p>
              </div>

              {/* Social Login */}
              <div className="mb-6">
                <SocialButton provider="google" onClick={() => handleSocialLogin('google')}>
                  Sign in with Google
                </SocialButton>
              </div>

              <Divider text="Or continue with email" />

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                    disabled={loading}
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                    Remember me
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile: Stacked Layout */}
      <div className="lg:hidden w-full min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30">
        <div className="flex flex-col min-h-screen">
          {/* Compact Brand Header */}
          <div className="flex-shrink-0">
            <MobileBrandHeader features={features} />
          </div>

          {/* Auth Card */}
          <div className="flex-1 px-4 pt-6 pb-10">
            <Card className="p-4 border border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
                  Welcome back
                </h2>
                <p className="text-gray-600 text-sm">
                  Sign in to your account
                </p>
              </div>

              {/* Social Login */}
              <div className="mb-4">
                <SocialButton provider="google" onClick={() => handleSocialLogin('google')}>
                  Sign in with Google
                </SocialButton>
              </div>

              <Divider text="Or continue with email" />

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email-mobile"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password-mobile" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password-mobile"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 pr-12 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center pt-1">
                  <input
                    id="remember-mobile"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                    disabled={loading}
                  />
                  <label htmlFor="remember-mobile" className="ml-2 text-sm text-gray-600">
                    Remember me
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 h-11 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-5 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

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
import { PasswordStrength } from '@/components/auth/password-strength'

const countries = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
]

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    company: '',
    email: '',
    phone: '',
    password: '',
    country: 'KE',
    agreeTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const formatPhoneNumber = (value: string, countryCode: string) => {
    if (countryCode === 'KE') {
      // Remove all non-digits
      let cleaned = value.replace(/\D/g, '')
      // If starts with 0, replace with 254
      if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1)
      } else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned
      }
      return cleaned
    }
    return value.replace(/\D/g, '')
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value, formData.country)
    setFormData((prev) => ({ ...prev, phone: formatted }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.company || formData.email.split('@')[0],
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Store token and user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('isAuthenticated', 'true')
        
        router.push('/app/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignup = (provider: 'google') => {
    if (provider === 'google') {
      window.location.href = '/api/auth/google/start?intent=register'
      return
    }
  }

  const features = [
    '99.9% uptime SLA with carrier-grade infrastructure',
    'Enterprise security with end-to-end encryption',
    'Real-time delivery tracking and analytics',
  ]

  const selectedCountry = countries.find((c) => c.code === formData.country)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 flex">
      {/* Desktop: Two Column Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 w-full">
        {/* Left: Brand Panel */}
        <div className="relative">
          <BrandPanel features={features} />
        </div>

        {/* Right: Auth Card */}
        <div className="flex items-center justify-center p-8 xl:p-12 overflow-y-auto">
          <div className="w-full max-w-md">
            <Card className="p-8 sm:p-10 border border-gray-200 rounded-3xl shadow-lg bg-white">
              {/* Header */}
              <div className="mb-8">
                <Link href="/" className="inline-block mb-6">
                  <span className="text-2xl font-bold text-emerald-600">TXTLink</span>
                </Link>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  Create your account
                </h1>
                <p className="text-gray-600">
                  Start sending SMS with enterprise-grade infrastructure
                </p>
              </div>

              {/* Social Signup */}
              <div className="mb-6">
                <SocialButton provider="google" onClick={() => handleSocialSignup('google')}>
                  Sign up with Google
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
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company name
                  </label>
                  <input
                    id="company"
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Your company"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      disabled={loading}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone number
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        {selectedCountry?.flag} {formData.country === 'KE' ? '+254' : '+'}
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder={formData.country === 'KE' ? '7XX XXX XXX' : 'Phone number'}
                        className="w-full pl-20 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
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
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="flex items-start">
                  <input
                    id="agreeTerms"
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-1 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                    required
                    disabled={loading}
                  />
                  <label htmlFor="agreeTerms" className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <Link
                      href="/legal/terms"
                      className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/legal/privacy"
                      className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !formData.agreeTerms}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Sign In Link */}
              <div className="mt-8 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  Sign in
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
          <div className="flex-1 px-4 pt-6 pb-10 overflow-y-auto">
            <Card className="p-4 border border-slate-200 rounded-2xl shadow-sm bg-white">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
                  Create your account
                </h2>
                <p className="text-gray-600 text-sm">
                  Start sending SMS with enterprise infrastructure
                </p>
              </div>

              {/* Social Signup */}
              <div className="mb-4">
                <SocialButton provider="google" onClick={() => handleSocialSignup('google')}>
                  Sign up with Google
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
                  <label htmlFor="company-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Company name
                  </label>
                  <input
                    id="company-mobile"
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Your company"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="email-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email-mobile"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="country-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    id="country-mobile"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                    disabled={loading}
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="phone-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      {selectedCountry?.flag} {formData.country === 'KE' ? '+254' : '+'}
                    </div>
                    <input
                      id="phone-mobile"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder={formData.country === 'KE' ? '7XX XXX XXX' : 'Phone number'}
                      className="w-full pl-20 pr-4 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-base"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-mobile" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password-mobile"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
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
                  <PasswordStrength password={formData.password} />
                </div>

                <div className="flex items-start pt-1">
                  <input
                    id="agreeTerms-mobile"
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-1 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                    required
                    disabled={loading}
                  />
                  <label htmlFor="agreeTerms-mobile" className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <Link
                      href="/legal/terms"
                      className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/legal/privacy"
                      className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !formData.agreeTerms}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 h-11 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Sign In Link */}
              <div className="mt-5 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

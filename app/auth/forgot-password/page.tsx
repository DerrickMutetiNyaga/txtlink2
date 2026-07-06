'use client'

import React from "react"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8 border-teal-200/50 shadow-xl bg-white/95 backdrop-blur-sm text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-8">
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Didn't receive the email? Check your spam folder or try again.</p>
              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                className="w-full border-teal-300 text-gray-700 hover:bg-teal-50"
              >
                Try Another Email
              </Button>
              <Link href="/auth/login" className="block">
                <Button className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/30">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="text-2xl font-bold text-teal-700 hover:text-teal-800 transition-colors">
            TXTLINK
          </Link>
        </div>

        {/* Card */}
        <Card className="p-8 border-teal-200/50 shadow-xl bg-white/95 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600 mb-8">Enter your email address and we'll send you a link to reset your password.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/30 py-3 transition-all"
            >
              {loading ? 'Sending...' : 'Send Reset Link'} {!loading && <ArrowRight className="ml-2" size={18} />}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Remember your password? </span>
            <Link href="/auth/login" className="text-teal-600 font-medium hover:text-teal-700 hover:underline">
              Sign in
            </Link>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <Link href="/" className="hover:text-teal-600 transition-colors font-medium">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { DocsLayout } from '@/components/docs-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/docs/code-block'
import { Callout } from '@/components/docs/callout'
import { 
  Send, 
  Lock, 
  BarChart3, 
  Webhook, 
  ArrowRight,
  Zap,
  Shield,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

export default function DevelopersPage() {
  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome to TXTLINK
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Enterprise SMS infrastructure for mission-critical communications. 
            Build reliable messaging into your applications with our REST API, 
            SMPP protocol, and comprehensive SDKs.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Link href="/developers/quick-start">
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-slate-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Quick Start</h3>
                  <p className="text-sm text-slate-600">
                    Get up and running in 5 minutes
                  </p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/developers/api/rest">
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-slate-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Webhook className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">REST API</h3>
                  <p className="text-sm text-slate-600">
                    Complete API reference
                  </p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/developers/authentication">
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-slate-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Authentication</h3>
                  <p className="text-sm text-slate-600">
                    API keys & credentials
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Use Cases */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Supported Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Transactional SMS</h3>
                  <p className="text-sm text-slate-600">
                    Send OTPs, confirmations, and critical alerts with sub-second delivery 
                    and 99.9% uptime SLA.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">OTP & Verification</h3>
                  <p className="text-sm text-slate-600">
                    Secure one-time passwords with customizable expiry, rate limiting, 
                    and brute-force protection.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Bulk & Promotional SMS</h3>
                  <p className="text-sm text-slate-600">
                    Send millions of SMS campaigns with advanced segmentation, 
                    A/B testing, and real-time analytics.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Webhook className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">APIs & Webhooks</h3>
                  <p className="text-sm text-slate-600">
                    REST and SMPP APIs with webhook support for real-time event 
                    notifications and delivery reports.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Architecture */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Architecture</h2>
          <Card className="p-8 bg-slate-50">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="px-6 py-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-900">Your Application</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="px-6 py-3 bg-emerald-600 text-white rounded-lg shadow-sm">
                  <span className="text-sm font-medium">TXTLINK API</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="px-6 py-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-900">Carrier Networks</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>End-to-end encryption • 99.9% uptime SLA • GDPR compliant</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Start in 5 Minutes */}
        <div className="mb-12">
          <Card className="p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Start building in 5 minutes
              </h2>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                Get your API key and send your first SMS in under 5 minutes. 
                No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/developers/quick-start">
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-8 py-2.5">
                    Quick Start Guide
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">Sub-second Delivery</h4>
                <p className="text-sm text-slate-600">Ultra-low latency for critical messages</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">99.9% Uptime SLA</h4>
                <p className="text-sm text-slate-600">Enterprise-grade reliability</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">Multiple SDKs</h4>
                <p className="text-sm text-slate-600">Node, Python, PHP, Java, Go, Ruby</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">Webhook Support</h4>
                <p className="text-sm text-slate-600">Real-time delivery reports</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">GDPR Compliant</h4>
                <p className="text-sm text-slate-600">Enterprise security standards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">REST & SMPP</h4>
                <p className="text-sm text-slate-600">Choose your integration method</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}

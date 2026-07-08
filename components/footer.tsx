'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  Github, 
  Twitter, 
  Linkedin,
  Code,
  Shield,
  CheckCircle2,
  Phone
} from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        {/* Top CTA Strip */}
        <div className="pt-8 sm:pt-12 md:pt-16 pb-8 sm:pb-10 md:pb-12 border-b border-slate-200">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
            <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 px-4 sm:px-6 md:px-10 py-8 sm:py-10 md:py-12 shadow-sm">
              {/* Subtle top accent line */}
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-r from-teal-500 to-emerald-500" />
              
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900">
                Build reliable messaging in minutes
              </h3>
              
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600">
                Sender IDs, Bulk SMS, OTP, Webhooks, and carrier-grade delivery.
              </p>
              
              <div className="mt-6 sm:mt-8 flex justify-center">
                {/* PRIMARY CTA */}
                <Link href="/auth/register">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-white shadow hover:bg-teal-700 transition-all">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="py-8 sm:py-12 md:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12 px-4 sm:px-6">
          {/* Column 1: Brand */}
          <div className="space-y-5">
            <div>
              <Link href="/" className="inline-block">
                <span className="text-2xl font-bold text-teal-600 hover:text-teal-700 transition-colors">
                  TXTLINK
                </span>
              </Link>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
              Enterprise SMS infrastructure for mission-critical communications.
            </p>
            
            {/* Trust Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Code className="w-3.5 h-3.5 text-teal-600" />
                <span>Open API</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Production-ready</span>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-teal-600 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-teal-600 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-teal-600 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Products */}
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-5 uppercase tracking-wider">
              Products
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/products" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Solutions
                </Link>
              </li>
              <li>
                <Link 
                  href="/pricing" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link 
                  href="/sender-id" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Sender IDs
                </Link>
              </li>
              <li>
                <Link 
                  href="/products#bulk-sms" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Bulk SMS
                </Link>
              </li>
              <li>
                <Link 
                  href="/products#otp" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  OTP & Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Developers */}
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-5 uppercase tracking-wider">
              Developers
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/developers" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  API Docs
                </Link>
              </li>
              <li>
                <Link 
                  href="/developers#sdks" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  SDKs
                </Link>
              </li>
              <li>
                <Link 
                  href="/developers#webhooks" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Webhooks
                </Link>
              </li>
              <li>
                <Link 
                  href="/status" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Status / Changelog
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company / Legal */}
          <div>
            <h4 className="font-semibold text-sm text-slate-900 mb-5 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/about" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  About
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link 
                  href="/legal/privacy" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link 
                  href="/legal/terms" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link 
                  href="/legal/acceptable-use" 
                  className="text-sm text-slate-600 hover:text-teal-600 hover:underline transition-colors inline-block"
                >
                  Acceptable Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 sm:py-8 border-t border-slate-200 px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                © {currentYear} TXTLINK. All rights reserved.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-6">
                <a
                  href="tel:+254794269051"
                  className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-teal-600 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="break-all sm:break-normal">Call: +254 794 269 051</span>
                </a>
                <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500">
                  <Link 
                    href="/legal/privacy" 
                    className="hover:text-teal-600 hover:underline transition-colors"
                  >
                    Privacy
                  </Link>
                  <span>•</span>
                  <Link 
                    href="/legal/terms" 
                    className="hover:text-teal-600 hover:underline transition-colors"
                  >
                    Terms
                  </Link>
                  <span>•</span>
                  <Link 
                    href="/legal/cookies" 
                    className="hover:text-teal-600 hover:underline transition-colors"
                  >
                    Cookies
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex justify-center sm:justify-end">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200/50">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-xs font-medium text-teal-700">Status: Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}


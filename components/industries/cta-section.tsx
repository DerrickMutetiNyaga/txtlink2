'use client'

import React from 'react'
import { ArrowRight, Clock, Shield } from 'lucide-react'
import Link from 'next/link'

export function CTASection() {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-600 to-teal-700 shadow-xl">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
      <div className="relative px-10 py-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <h3 className="text-3xl font-semibold text-white mb-3">
              Ready to transform your messaging?
            </h3>
            <p className="mt-3 max-w-xl text-teal-100">
              Let's discuss how TXTLINK can meet your industry-specific messaging needs with 
              enterprise-grade infrastructure and compliance.
            </p>
            <div className="mt-4 flex items-center gap-6 text-sm text-teal-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Response within 24 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>SLAs available</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            {/* PRIMARY CTA - White background, teal text */}
            <Link href="/contact">
              <button className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-teal-700 shadow hover:shadow-md transition-all hover:-translate-y-0.5">
                Contact Sales
                <ArrowRight className="ml-1.5 w-4 h-4 inline" />
              </button>
            </Link>
            {/* SECONDARY CTA - Outline, white text */}
            <Link href="/pricing">
              <button className="rounded-xl border border-white/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-all">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


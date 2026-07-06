'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Radio, BarChart3, Zap, Lock, MessageSquare, Code, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ProductsPage() {
  const products = [
    {
      icon: Radio,
      title: 'Sender ID Registration',
      description: 'Register and manage dedicated sender IDs for consistent brand identity.',
      features: ['Carrier-grade registration', 'Instant activation', 'Multi-market support', 'Tier 1 priority'],
      keyFeature: 'Carrier-grade registration',
      bestFor: 'brand identity',
      compliance: ['GDPR', 'Local Telecom'],
      href: '/sender-id',
    },
    {
      icon: BarChart3,
      title: 'Bulk SMS',
      description: 'Send millions of SMS campaigns with advanced segmentation and analytics.',
      features: ['Up to 1M SMS/batch', 'Template management', 'A/B testing', 'Real-time reports'],
      keyFeature: 'Up to 1M SMS/batch',
      bestFor: 'campaigns',
      compliance: ['GDPR', 'Anti-spam'],
      href: '#',
    },
    {
      icon: Zap,
      title: 'Transactional SMS',
      description: 'Ultra-low latency SMS for OTPs, confirmations, and critical alerts.',
      features: ['Sub-second delivery', '99.9% uptime SLA', 'Automatic retry', 'DLR tracking'],
      keyFeature: 'Sub-second delivery',
      bestFor: 'critical alerts',
      compliance: ['HIPAA', 'PCI-DSS'],
      href: '#',
    },
    {
      icon: MessageSquare,
      title: 'Promotional SMS',
      description: 'Marketing campaigns with compliance tracking and audience segmentation.',
      features: ['Compliance management', 'Opt-out tracking', 'Detailed analytics', 'Cost optimization'],
      keyFeature: 'Compliance management',
      bestFor: 'marketing',
      compliance: ['GDPR', 'CASL'],
      href: '#',
    },
    {
      icon: Lock,
      title: 'OTP & Verification',
      description: 'Secure one-time passwords for authentication and transaction confirmation.',
      features: ['Customizable OTP', 'Configurable expiry', 'Rate limiting', 'Brute-force protection'],
      keyFeature: 'Brute-force protection',
      bestFor: 'OTP security',
      compliance: ['GDPR', 'ISO 27001'],
      href: '#',
    },
    {
      icon: Code,
      title: 'SMS API',
      description: 'REST and SMPP APIs for seamless integration into existing workflows.',
      features: ['REST API v2', 'SMPP v3.4', 'Webhooks', 'Multiple SDKs'],
      keyFeature: 'Multiple SDKs',
      bestFor: 'developers',
      compliance: ['Enterprise API'],
      href: '/developers',
    },
  ]

  return (
    <MarketingLayout>
      <div className="bg-slate-50">
        <div className="px-6 py-16 max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">Our Products</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Comprehensive SMS solutions designed for enterprises, governments, and financial institutions worldwide.
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {products.map((product, index) => (
              <ProductCard
                key={product.title}
                icon={product.icon}
                title={product.title}
                description={product.description}
                features={product.features}
                keyFeature={product.keyFeature}
                bestFor={product.bestFor}
                compliance={product.compliance}
                href={product.href}
                index={index}
              />
            ))}
          </div>

          {/* Custom Solution Section */}
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-white to-teal-50/20 pointer-events-none" />
            
            <div className="relative z-10 p-12 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Need a custom solution?</h2>
              <p className="text-base text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed">
                Talk to our enterprise team about custom SMS solutions, dedicated infrastructure, or volume-based pricing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/contact">
                  <Button className="bg-teal-600 text-white hover:bg-teal-700 px-8 h-11 rounded-lg font-medium shadow-sm hover:shadow-md hover:shadow-teal-500/20 transition-all duration-300 group/btn">
                    Talk to sales
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-8 h-11 rounded-lg font-medium transition-all duration-300">
                    View enterprise features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  )
}

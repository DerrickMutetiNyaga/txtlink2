'use client'

import { useState, useEffect } from 'react'
import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SenderIdAdBanner from '@/components/sender-id-ad/SenderIdAdBanner'
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Rocket,
  ShieldCheck,
  Building2,
  TrendingUp,
  FileText,
  HelpCircle,
  BarChart3,
  Server,
  Shield,
} from 'lucide-react'
import Link from 'next/link'

// Icon mapping
const iconMap: Record<string, any> = {
  Rocket,
  ShieldCheck,
  Building2,
}

export default function PricingPage() {
  // Use default data immediately - no loading state
  const [pricingData, setPricingData] = useState<any>(null)

  // Default tiers (shown immediately)
  const defaultTiers = [
    {
      name: 'Starter',
      price: 'KSh 0.3',
      priceDecimal: '',
      unit: 'per SMS',
      description: 'For growing businesses starting their SMS journey',
      icon: Rocket,
      accentColor: 'teal',
      features: [
        { text: 'Up to 10,000 SMS/month', category: 'Sending', highlight: false },
        { text: 'Basic sender ID', category: 'Sending', highlight: false },
        { text: 'REST API access', category: 'API', highlight: true },
        { text: 'Email support', category: 'Support', highlight: false },
        { text: 'Standard routing', category: 'Sending', highlight: false },
        { text: 'Web dashboard', category: 'Support', highlight: false },
      ],
      cta: 'Get Started',
      ctaSecondary: 'See full API docs',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: 'KSh 0.25',
      priceDecimal: '',
      unit: 'per SMS',
      description: 'For established businesses with high volume',
      icon: ShieldCheck,
      accentColor: 'indigo',
      features: [
        { text: 'Unlimited SMS volume', category: 'Sending', highlight: true },
        { text: 'Dedicated sender ID', category: 'Sending', highlight: false },
        { text: 'REST + SMPP APIs', category: 'API', highlight: true },
        { text: 'Priority 24/7 support', category: 'Support', highlight: false },
        { text: 'Advanced analytics', category: 'Support', highlight: false },
        { text: 'Carrier optimization', category: 'Sending', highlight: false },
        { text: 'Webhook integration', category: 'API', highlight: false },
        { text: 'Custom templates', category: 'Sending', highlight: false },
      ],
      cta: 'Start Free Trial',
      ctaSecondary: 'Compare plans',
      highlighted: true,
      highlightReason: 'Best balance of cost + deliverability',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      priceDecimal: '',
      unit: 'pricing',
      description: 'For large-scale operations and institutions',
      icon: Building2,
      accentColor: 'slate',
      features: [
        { text: 'Unlimited everything', category: 'Sending', highlight: true },
        { text: 'Multiple dedicated sender IDs', category: 'Sending', highlight: false },
        { text: 'Custom API solutions', category: 'API', highlight: true },
        { text: 'Dedicated account manager', category: 'Support', highlight: false },
        { text: '99.99% SLA guarantee', category: 'Support', highlight: false },
        { text: 'Custom infrastructure', category: 'Sending', highlight: false },
        { text: 'Dedicated support team', category: 'Support', highlight: false },
        { text: 'Volume-based pricing', category: 'Sending', highlight: false },
      ],
      cta: 'Request Quote',
      ctaSecondary: 'Talk to an engineer',
      highlighted: false,
    },
  ]

  const defaultDiscounts = [
    { volume: '1M - 10M', discount: '10%', price: 'KSh 0.26' },
    { volume: '10M - 50M', discount: '15%', price: 'KSh 0.21' },
    { volume: '50M - 100M', discount: '20%', price: 'KSh 0.15' },
    { volume: '100M+', discount: 'Custom', price: 'Contact' },
  ]

  // Fetch pricing in background (non-blocking)
  useEffect(() => {
    // Use setTimeout to defer API call and let page render first
    const timer = setTimeout(() => {
      fetch('/api/marketing-pricing')
        .then(res => res.ok ? res.json() : null)
        .then(result => {
          if (result?.pricing) {
            setPricingData(result.pricing)
          }
        })
        .catch(error => {
          console.error('Error fetching pricing:', error)
          // Silently fail - defaults are already shown
        })
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const tiers = pricingData?.tiers || defaultTiers
  const discounts = pricingData?.volumeDiscounts || defaultDiscounts
  const pageTitle = pricingData?.pageTitle || 'Simple, Transparent Pricing'
  const pageSubtitle = pricingData?.pageSubtitle || 'Scale your messaging without hidden fees. Only pay for what you send.'

  const getAccentGradient = (accentColor: string) => {
    switch (accentColor) {
      case 'teal':
        return 'from-teal-500/20 via-emerald-500/10 to-cyan-500/20'
      case 'indigo':
        return 'from-indigo-500/20 via-teal-500/15 to-cyan-500/20'
      case 'slate':
        return 'from-slate-500/20 via-teal-500/15 to-indigo-500/20'
      default:
        return 'from-teal-500/20 via-emerald-500/10 to-cyan-500/20'
    }
  }

  const getIconBgGradient = (accentColor: string) => {
    switch (accentColor) {
      case 'teal':
        return 'from-teal-500 to-emerald-500'
      case 'indigo':
        return 'from-indigo-500 via-teal-500 to-cyan-500'
      case 'slate':
        return 'from-slate-600 via-teal-500 to-indigo-500'
      default:
        return 'from-teal-500 to-emerald-500'
    }
  }

  const getButtonGradient = (accentColor: string, isHighlighted: boolean) => {
    if (isHighlighted) {
      return 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/30'
    }
    switch (accentColor) {
      case 'teal':
        return 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white'
      case 'indigo':
        return 'bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white'
      case 'slate':
        return 'bg-gradient-to-r from-slate-700 to-teal-600 hover:from-slate-800 hover:to-teal-700 text-white'
      default:
        return 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white'
    }
  }

  const getCardBorder = (accentColor: string, isHighlighted: boolean) => {
    if (isHighlighted) {
      return 'border-teal-300/50 ring-2 ring-teal-500/30'
    }
    switch (accentColor) {
      case 'teal':
        return 'border-teal-200/50'
      case 'indigo':
        return 'border-indigo-200/50'
      case 'slate':
        return 'border-slate-200/50'
      default:
        return 'border-teal-200/50'
    }
  }

  const groupedFeatures = (features: typeof tiers[0]['features']) => {
    const groups: Record<string, typeof features> = {}
    features.forEach((feature) => {
      if (!groups[feature.category]) {
        groups[feature.category] = []
      }
      groups[feature.category].push(feature)
    })
    return groups
  }

  return (
    <MarketingLayout>
      <div className="marketing-container py-8 sm:py-12 w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Sender ID Ad Banner */}
        <SenderIdAdBanner currentPage="pricing" />
        
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-gray-900 mb-4">{pageTitle}</h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-2">
            {pageSubtitle}
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {tiers.map((tier: any) => {
            const IconComponent = iconMap[tier.icon] || Rocket
            const featureGroups = groupedFeatures(tier.features)
            const isHighlighted = tier.highlighted

            return (
              <div
              key={tier.name}
                className={`relative group transition-all duration-300 min-w-0 w-full max-w-full ${
                  isHighlighted ? 'pt-6 lg:pt-0 lg:-mt-4 lg:mb-4' : ''
                }`}
              >
                {/* Most Popular Ribbon */}
                {isHighlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full blur-sm opacity-75 animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  MOST POPULAR
                      </div>
                    </div>
                  </div>
                )}

                <Card
                  className={`relative overflow-hidden flex flex-col h-full transition-all duration-300 w-full max-w-full min-w-0 ${
                    isHighlighted
                      ? `bg-gradient-to-b from-teal-50/50 via-white to-white border-2 ${getCardBorder(tier.accentColor, true)} shadow-xl hover:shadow-2xl lg:hover:scale-[1.02]`
                      : `bg-white border ${getCardBorder(tier.accentColor, false)} shadow-md hover:shadow-xl lg:hover:-translate-y-1`
                  }`}
                >
                  {/* Decorative Background Blob */}
                  <div
                    className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${getAccentGradient(tier.accentColor)} rounded-full blur-3xl opacity-40 -z-0`}
                  ></div>
                  <div
                    className={`absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr ${getAccentGradient(tier.accentColor)} rounded-full blur-2xl opacity-30 -z-0`}
                  ></div>

                  {/* Card Content */}
                  <div className="relative z-10 p-5 sm:p-6 lg:p-8 flex flex-col h-full">
                    {/* Plan Identity Row */}
                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getIconBgGradient(tier.accentColor)} flex items-center justify-center shadow-lg flex-shrink-0`}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{tier.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 font-medium break-words">{tier.description}</p>
                        </div>
                      </div>
                      {isHighlighted && tier.highlightReason && (
                        <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-3 py-1.5 rounded-md w-fit">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="font-medium">{tier.highlightReason}</span>
                </div>
              )}
                    </div>

                    {/* Price Section */}
              <div className="mb-6 sm:mb-8">
                      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">{tier.price}</span>
                        {tier.priceDecimal && (
                          <span className="text-2xl font-semibold text-gray-500">{tier.priceDecimal}</span>
                        )}
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {tier.unit}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span>No setup fees • Pay as you grow</span>
                      </p>
                    </div>

                    {/* Feature List */}
                    <ul className="space-y-4 mb-8 flex-grow">
                      {Object.entries(featureGroups).map(([category, categoryFeatures]) => (
                        <li key={category}>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {category}
              </div>
                          <ul className="space-y-2.5">
                            {categoryFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                                {feature.highlight ? (
                                  <Sparkles className="text-teal-600 flex-shrink-0 mt-0.5 w-4 h-4" />
                                ) : (
                                  <CheckCircle2 className="text-teal-600 flex-shrink-0 mt-0.5 w-4 h-4" />
                                )}
                                <span className="text-gray-700 leading-relaxed">{feature.text}</span>
                              </li>
                            ))}
                          </ul>
                  </li>
                ))}
              </ul>

                    {/* CTA Section */}
                    <div className="mt-auto space-y-3">
                      <Link
                        href={tier.name === 'Enterprise' ? '/contact' : '/auth/register'}
                        className="block"
                      >
                <Button
                          className={`w-full ${getButtonGradient(tier.accentColor, isHighlighted)} group/btn transition-all duration-300`}
                          size="lg"
                        >
                          <span>{tier.cta}</span>
                          <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Button>
              </Link>
                      <Link
                        href={tier.name === 'Enterprise' ? '/contact' : '/docs'}
                        className="block text-center"
                      >
                        <span className="text-xs text-gray-500 hover:text-teal-600 transition-colors cursor-pointer">
                          {tier.ctaSecondary} →
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Hover Glow Effect */}
                  <div
                    className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                      isHighlighted
                        ? 'ring-4 ring-teal-500/20'
                        : tier.accentColor === 'indigo'
                        ? 'ring-2 ring-indigo-500/20'
                        : tier.accentColor === 'slate'
                        ? 'ring-2 ring-slate-500/20'
                        : 'ring-2 ring-teal-500/20'
                    }`}
                  ></div>
            </Card>
              </div>
            )
          })}
        </div>

        {/* Trust Row */}
        <div className="mb-16">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-600" />
              <span className="font-medium">Carrier-grade routing</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span className="font-medium">99.9% uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />
              <span className="font-medium">SLA available</span>
            </div>
          </div>
        </div>

        {/* Compare Features Link */}
        <div className="text-center mb-16">
          <Link
            href="#compare"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Compare all features</span>
          </Link>
        </div>

        {/* Volume Discounts */}
        <div id="compare" className="mb-12 sm:mb-16 scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">Volume Discounts</h2>
          <div className="table-wrapper border border-gray-200 rounded-xl shadow-sm bg-white">
            <table className="w-full min-w-[480px]">
              <thead className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">SMS Volume</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Discount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Price per SMS</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((row: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-teal-50/50 transition-colors last:border-0"
                  >
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{row.volume}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-teal-600">{row.discount}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ / CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Common Questions</h2>
            <div className="space-y-6">
              <div className="border-l-4 border-teal-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  Is there a setup fee?
                </h3>
                <p className="text-sm text-gray-600">No. TXTLINK has zero setup fees, no monthly minimums, and no cancellation fees.</p>
              </div>
              <div className="border-l-4 border-teal-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  Can I cancel anytime?
                </h3>
                <p className="text-sm text-gray-600">Yes. Cancel your account at any time without penalties.</p>
              </div>
              <div className="border-l-4 border-teal-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  What payment methods do you accept?
                </h3>
                <p className="text-sm text-gray-600">We accept credit cards, M-Pesa, and bank transfers for enterprise customers.</p>
              </div>
              <div className="border-l-4 border-teal-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  Do you offer custom pricing?
                </h3>
                <p className="text-sm text-gray-600">Yes. Enterprise customers with high volumes qualify for custom rates.</p>
              </div>
            </div>
          </div>

          <Card className="p-5 sm:p-6 lg:p-8 bg-gradient-to-br from-teal-600 to-emerald-600 text-white border-none shadow-xl w-full max-w-full min-w-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">Request Enterprise Pricing</h3>
            </div>
            <form className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-white/90">Company Name</label>
                <input
                  type="text"
                  placeholder="Your company"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-white/90">Monthly Volume</label>
                <input
                  type="text"
                  placeholder="e.g., 50M SMS/month"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-white/90">Email</label>
                <input
                  type="email"
                  placeholder="your@company.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <Button className="w-full bg-white text-teal-600 hover:bg-white/90 font-semibold shadow-lg">
                Request Quote
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  )
}

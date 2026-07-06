'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { IndustryCard } from '@/components/industries/industry-card'
import { IndustryFilterBar } from '@/components/industries/industry-filter-bar'
import { ValueTile } from '@/components/industries/value-tile'
import { FeaturedSpotlight } from '@/components/industries/featured-spotlight'
import { CTASection } from '@/components/industries/cta-section'
import {
  CreditCard,
  Heart,
  GraduationCap,
  Truck,
  Building2,
  Users,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Webhook,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

interface Industry {
  id: string
  icon: typeof CreditCard
  title: string
  bestFor: string
  topOutcomes: string[]
  keyFeatures: string[]
  useCases: string[]
  variant: 'default' | 'gradient-stripe' | 'rounded-badge'
  category: string
}

export default function IndustriesPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const industries: Industry[] = [
    {
      id: 'banking',
      icon: CreditCard,
      title: 'Banking & Fintech',
      bestFor: 'transaction security',
      topOutcomes: [
        'PCI-DSS compliant messaging',
        'Sub-second OTP delivery',
      ],
      keyFeatures: [
        'Transaction alerts',
        'OTP for banking',
        'Account notifications',
        'Fraud alerts',
        'Balance updates',
      ],
      useCases: ['Payment confirmations', 'Balance alerts', 'Card transactions', 'Account security'],
      variant: 'gradient-stripe',
      category: 'banking',
    },
    {
      id: 'healthcare',
      icon: Heart,
      title: 'Healthcare',
      bestFor: 'patient engagement',
      topOutcomes: [
        'HIPAA-compliant messaging',
        'Automated appointment reminders',
      ],
      keyFeatures: [
        'Appointment reminders',
        'Test result notifications',
        'Prescription alerts',
        'Health tips',
        'Patient communications',
      ],
      useCases: ['Appointment scheduling', 'Lab results', 'Medication reminders', 'Health campaigns'],
      variant: 'default',
      category: 'healthcare',
    },
    {
      id: 'education',
      icon: GraduationCap,
      title: 'Education',
      bestFor: 'student communications',
      topOutcomes: [
        'Bulk messaging capabilities',
        'Parent notification system',
      ],
      keyFeatures: [
        'Bulk messaging',
        'Parent notifications',
        'Exam schedules',
        'Emergency alerts',
        'Fee reminders',
      ],
      useCases: ['School announcements', 'Exam results', 'Fee payments', 'Event notifications'],
      variant: 'rounded-badge',
      category: 'education',
    },
    {
      id: 'logistics',
      icon: Truck,
      title: 'Logistics & E-commerce',
      bestFor: 'order tracking',
      topOutcomes: [
        'Real-time delivery updates',
        'Reduced support inquiries',
      ],
      keyFeatures: [
        'Order confirmations',
        'Shipping updates',
        'Delivery notifications',
        'Customer support',
        'Promotional campaigns',
      ],
      useCases: ['Order tracking', 'Delivery alerts', 'Customer support', 'Marketing campaigns'],
      variant: 'gradient-stripe',
      category: 'logistics',
    },
    {
      id: 'government',
      icon: Building2,
      title: 'Government',
      bestFor: 'public services',
      topOutcomes: [
        'Emergency alert system',
        'Citizen engagement platform',
      ],
      keyFeatures: [
        'Emergency alerts',
        'Public announcements',
        'Service notifications',
        'Citizen engagement',
        'Compliance ready',
      ],
      useCases: ['Emergency alerts', 'Public services', 'Tax reminders', 'Voting information'],
      variant: 'default',
      category: 'government',
    },
    {
      id: 'telecom',
      icon: Users,
      title: 'Telecom & Utilities',
      bestFor: 'service notifications',
      topOutcomes: [
        'Automated billing reminders',
        'Outage notification system',
      ],
      keyFeatures: [
        'Billing reminders',
        'Service updates',
        'Outage notifications',
        'Maintenance alerts',
        'Customer support',
      ],
      useCases: ['Bill payments', 'Service disruptions', 'Maintenance notices', 'Customer care'],
      variant: 'rounded-badge',
      category: 'telecom',
    },
  ]

  const filteredIndustries = useMemo(() => {
    return industries.filter((industry) => {
      const matchesFilter = activeFilter === 'all' || industry.category === activeFilter
      const matchesSearch =
        searchQuery === '' ||
        industry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        industry.bestFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        industry.useCases.some((uc) => uc.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesFilter && matchesSearch
    })
  }, [activeFilter, searchQuery])

  const valueTiles = [
    {
      icon: Shield,
      title: 'Compliance Ready',
      description: 'Built-in compliance with GDPR, HIPAA, PCI-DSS, and local regulations',
      metric: 'GDPR • HIPAA • PCI-DSS',
    },
    {
      icon: Zap,
      title: 'High Deliverability',
      description: '99.9% delivery rate with carrier-grade routing and optimization',
      metric: '99.9% DLR tracking',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Comprehensive reporting and analytics for all messaging activities',
      metric: '<1s OTP delivery',
    },
    {
      icon: Webhook,
      title: 'Scalable Infrastructure',
      description: 'Handle millions of messages with auto-scaling infrastructure',
      metric: 'Carrier-grade routing',
    },
  ]

  return (
    <MarketingLayout>
      <div className="bg-slate-50">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 relative overflow-hidden">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxNGI4YTYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
                  SMS Solutions for Every Industry
                </h1>
                <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                  Enterprise-grade messaging infrastructure tailored to your industry's unique 
                  requirements. From banking to healthcare, we deliver compliance-ready solutions 
                  that scale.
                </p>
                <div className="mt-8 flex items-center gap-4 mb-8">
                  <Link href="/contact">
                    <button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white shadow hover:bg-teal-700 transition-all">
                      Talk to an Expert
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/products">
                    <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all">
                      View Use Cases
                    </button>
                  </Link>
                </div>

                {/* Trust Pills */}
                <div className="flex flex-wrap gap-3">
                  {['GDPR-ready', 'High deliverability', 'Webhooks', 'OTP', 'Sender IDs'].map(
                    (pill) => (
                      <span
                        key={pill}
                        className="px-3 py-1.5 bg-white/80 backdrop-blur-sm text-slate-700 text-xs font-medium rounded-full border border-slate-200/60 shadow-sm"
                      >
                        {pill}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* Right Visual - Dashboard Preview */}
              <div className="hidden md:block">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="h-3 bg-slate-200 rounded mb-3 w-3/4" />
                    <div className="h-2 bg-slate-100 rounded mb-2 w-full" />
                    <div className="h-2 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="h-3 bg-teal-100 rounded mb-3 w-2/3" />
                    <div className="h-2 bg-slate-100 rounded mb-2 w-full" />
                    <div className="h-2 bg-slate-100 rounded w-4/5" />
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="h-3 bg-emerald-100 rounded mb-3 w-4/5" />
                    <div className="h-2 bg-slate-100 rounded mb-2 w-full" />
                    <div className="h-2 bg-slate-100 rounded w-3/4" />
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="h-3 bg-slate-200 rounded mb-3 w-3/5" />
                    <div className="h-2 bg-slate-100 rounded mb-2 w-full" />
                    <div className="h-2 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Industry Filter Bar */}
        <section className="px-6">
          <div className="max-w-7xl mx-auto">
            <IndustryFilterBar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </section>

        {/* Industry Cards */}
        <section className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              style={{
                transition: 'all 0.3s ease',
              }}
            >
              {filteredIndustries.map((industry, index) => (
                <IndustryCard
                  key={industry.id}
                  icon={industry.icon}
                  title={industry.title}
                  bestFor={industry.bestFor}
                  topOutcomes={industry.topOutcomes}
                  keyFeatures={industry.keyFeatures}
                  useCases={industry.useCases}
                  variant={industry.variant}
                  index={index}
                />
              ))}
            </div>
            {filteredIndustries.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-600">No industries found matching your search.</p>
              </div>
            )}
          </div>
        </section>

        {/* Why TXTLINK Section */}
        <section className="px-6 py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Why TXTLINK</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Enterprise-grade infrastructure built for reliability, compliance, and scale
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {valueTiles.map((tile, index) => (
                <ValueTile
                  key={index}
                  icon={tile.icon}
                  title={tile.title}
                  description={tile.description}
                  metric={tile.metric}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Industry Spotlight */}
        <section className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <FeaturedSpotlight />
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <CTASection />
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </MarketingLayout>
  )
}

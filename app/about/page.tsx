'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Target,
  Award,
  Globe,
  TrendingUp,
  Heart,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  MessageSquare,
  CheckCircle,
  MapPin,
  Clock,
  Building2,
  Mail,
} from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  const values = [
    {
      icon: Shield,
      title: 'Security First',
      description: 'We prioritize security and compliance in everything we build, ensuring your data is always protected.',
    },
    {
      icon: Zap,
      title: 'Reliability',
      description: '99.9% uptime SLA with carrier-grade infrastructure designed for mission-critical communications.',
    },
    {
      icon: Heart,
      title: 'Customer Focus',
      description: 'Your success is our success. We are committed to providing exceptional support and service.',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Connecting businesses across Africa and beyond with reliable, scalable messaging infrastructure.',
    },
  ]

  const stats = [
    { number: '99.9%', label: 'Uptime SLA', icon: TrendingUp },
    { number: '500+', label: 'Enterprise Clients', icon: Users },
    { number: '50M+', label: 'Messages/Month', icon: MessageSquare },
    { number: '15+', label: 'Countries Served', icon: Globe },
  ]

  const milestones = [
    { year: '2020', title: 'Founded', description: 'TXTLINK was founded with a mission to democratize enterprise SMS infrastructure', tag: 'Growth' },
    { year: '2021', title: 'First 100 Clients', description: 'Reached our first 100 enterprise clients across Africa', tag: 'Scale' },
    { year: '2022', title: 'ISO 27001 Certified', description: 'Achieved ISO 27001 certification for information security', tag: 'Compliance' },
    { year: '2023', title: '50M Messages/Month', description: 'Processed over 50 million messages per month', tag: 'Scale' },
    { year: '2024', title: '500+ Clients', description: 'Serving over 500 enterprise clients across multiple industries', tag: 'Growth' },
  ]

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {/* Background Treatment */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Title + Copy + Trust Row */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-[#0F766E] px-4 py-2 rounded-full text-sm font-medium border border-teal-200/50">
                <Users className="w-4 h-4" />
                <span>About TXTLINK</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-[#0B1220] leading-tight tracking-tight">
                Building the Future of Enterprise Messaging
              </h1>
              <p className="text-xl text-[#334155] leading-relaxed">
                TXTLINK is a leading provider of enterprise SMS infrastructure, helping businesses 
                across Africa and beyond deliver reliable, secure, and scalable messaging solutions.
              </p>

              {/* Trust Row */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>99.9% SLA</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Carrier routes</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                  <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Secure webhooks</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Kenya-based support</span>
                </div>
              </div>

              {/* Logo Strip Placeholder */}
              <div className="pt-6 border-t border-slate-200">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Trusted by</p>
                <div className="flex items-center gap-6 opacity-60">
                  <div className="h-8 w-24 bg-slate-200 rounded"></div>
                  <div className="h-8 w-24 bg-slate-200 rounded"></div>
                  <div className="h-8 w-24 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>

            {/* Right: Company Snapshot Card */}
            <div>
              <Card className="p-6 bg-white/90 backdrop-blur-sm border border-[#E2E8F0] rounded-2xl shadow-lg">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Company Snapshot
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0B1220]">Founded</p>
                      <p className="text-sm text-[#64748B]">2020</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0B1220]">Headquarters</p>
                      <p className="text-sm text-[#64748B]">Nairobi, Kenya</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0B1220]">Coverage</p>
                      <p className="text-sm text-[#64748B]">15+ countries</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0B1220]">Support</p>
                      <p className="text-sm text-[#64748B]">24/7 enterprise support</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-6 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Mission Card */}
            <Card className="p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#0F766E]" />
                </div>
                <span className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider bg-[#ECFDF5] px-3 py-1 rounded-full">
                  Mission
                </span>
              </div>
              <h2 className="text-3xl font-bold text-[#0B1220] mb-4">Our Mission</h2>
              <p className="text-[#334155] mb-6 leading-relaxed">
                To empower businesses with reliable, secure, and scalable messaging infrastructure 
                that enables seamless communication with their customers, employees, and partners.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                  <span className="text-[#334155]">Enterprise-grade messaging for businesses of all sizes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                  <span className="text-[#334155]">Democratizing access to carrier-grade infrastructure</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                  <span className="text-[#334155]">Enabling seamless customer communication at scale</span>
                </li>
              </ul>
            </Card>

            {/* Vision Card */}
            <Card className="p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                  <Award className="w-6 h-6 text-[#0F766E]" />
                </div>
                <span className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider bg-[#ECFDF5] px-3 py-1 rounded-full">
                  Vision
                </span>
              </div>
              <h2 className="text-3xl font-bold text-[#0B1220] mb-4">Our Vision</h2>
              <p className="text-[#334155] mb-6 leading-relaxed">
                To become the most trusted and reliable messaging infrastructure provider in Africa, 
                recognized for our commitment to security, compliance, and customer success.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                  <span className="text-[#334155]">Most trusted messaging provider in Africa</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                  <span className="text-[#334155]">Recognized for security, compliance, and customer success</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                  <span className="text-[#334155]">Reliable and secure delivery, every time</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 bg-slate-50/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mb-4">By The Numbers</h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Trusted by hundreds of enterprises across multiple industries
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const IconComponent = stat.icon
              return (
                <Card key={idx} className="p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 text-center h-full flex flex-col justify-center">
                  <div className="text-5xl md:text-6xl font-bold text-[#0B1220] mb-2 leading-none">{stat.number}</div>
                  <div className="text-sm font-semibold text-[#0B1220] mb-1">{stat.label}</div>
                  <div className="text-xs text-[#64748B]">Measured monthly</div>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mb-4">Our Values</h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, idx) => {
              const IconComponent = value.icon
              return (
                <Card key={idx} className="p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6 text-[#0F766E]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#0B1220] mb-2">{value.title}</h3>
                      <p className="text-sm text-[#64748B] leading-relaxed">{value.description}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6 bg-slate-50/30 border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B1220] mb-4">Our Journey</h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Key milestones in our growth and development
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#0F766E]/20 via-[#0F766E]/40 to-[#0F766E]/20"></div>
            <div className="space-y-8">
              {milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className={`relative flex items-start gap-8 ${
                    idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className="flex-1 md:w-1/2 md:ml-auto md:pr-12">
                    <Card className="p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-2xl font-bold text-[#0F766E]">{milestone.year}</div>
                        <span className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider bg-[#ECFDF5] px-2.5 py-1 rounded-full">
                          {milestone.tag}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-[#0B1220] mb-2">{milestone.title}</h3>
                      <p className="text-[#64748B] text-sm leading-relaxed">{milestone.description}</p>
                    </Card>
                  </div>
                  <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-3 h-3 bg-[#0F766E] rounded-full border-2 border-white shadow-md flex-shrink-0 z-10"></div>
                  <div className="flex-1 md:w-1/2 md:mr-auto md:pl-12 hidden md:block"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Compact Enterprise SaaS */}
      <section className="relative py-12 md:py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Rounded CTA Card */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0F766E] via-[#115E59] to-slate-900">
            {/* Subtle noise texture */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            
            {/* Soft radial glow */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ 
                background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)' 
              }} 
            />
            
            {/* Subtle blurred orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/8 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-400/8 rounded-full blur-3xl" />
            
            {/* Content */}
            <div className="relative z-10 px-6 py-10 md:px-12 md:py-14 text-center">
              {/* Icon badge */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 mb-5">
                <Users className="w-6 h-6 text-white" />
              </div>
              
              {/* Headline */}
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
                Join Us on Our Journey
              </h2>
              
              {/* Supporting copy */}
              <p className="text-base md:text-lg text-slate-200 mb-8 max-w-xl mx-auto leading-relaxed">
                Whether you're a customer, partner, or potential team member, we'd love to hear from you.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
                <Link href="/contact">
                  <Button className="bg-white text-[#0F766E] hover:bg-slate-50 hover:shadow-lg hover:-translate-y-0.5 px-6 h-11 text-sm font-semibold rounded-xl shadow-md transition-all duration-200">
                    Get in Touch
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 h-11 text-sm font-semibold text-white shadow-sm ring-1 ring-[#0F766E]/20 hover:bg-[#115E59] hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#0F766E]/20 transition-all duration-200">
                    View Pricing
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              {/* Trust micro-copy */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>2 hour response time</span>
                </div>
                <span className="text-slate-400">•</span>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>99.9% uptime SLA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}


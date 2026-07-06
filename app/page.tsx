'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MarketingLayout } from '@/components/marketing-layout'
import {
  Zap,
  Shield,
  Clock,
  BarChart3,
  Radio,
  MessageSquare,
  Code,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  Rocket,
  ShieldCheck,
  Building2,
  TrendingUp,
  Server,
  Building,
  Phone,
  Flag,
  Heart,
  Truck,
  Activity,
  Send,
  Check,
} from 'lucide-react'
import Link from 'next/link'

// Icon mapping
const iconMap: Record<string, any> = {
  Rocket,
  ShieldCheck,
  Building2,
}

export default function Home() {
  const [pricingData, setPricingData] = useState<any>(null)
  const [senderIdPricing, setSenderIdPricing] = useState<any>(null)

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/marketing-pricing')
        if (response.ok) {
          const result = await response.json()
          setPricingData(result.pricing)
        }
      } catch (error) {
        console.error('Error fetching pricing:', error)
      }
    }
    
    const fetchSenderIdPricing = async () => {
      try {
        const response = await fetch('/api/sender-id-pricing')
        if (response.ok) {
          const result = await response.json()
          setSenderIdPricing(result.pricing)
        }
      } catch (error) {
        console.error('Error fetching Sender ID pricing:', error)
      }
    }
    
    fetchPricing()
    fetchSenderIdPricing()
  }, [])

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 border-b border-gray-200 bg-gradient-to-b from-white via-emerald-50/40 to-white">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Soft Radial Glow */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] bg-emerald-200/20 rounded-full blur-3xl"></div>
          {/* Floating Blur Shapes */}
          <div className="absolute top-20 left-1/4 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-teal-100/30 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-1/4 w-24 h-24 sm:w-36 sm:h-36 md:w-48 md:h-48 bg-green-100/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
              {/* Main Heading - Outcome-Driven */}
              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                  Reliable SMS Infrastructure Built for Scale
                </h1>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Send transactional and bulk SMS with 99.9% uptime, verified Sender IDs, and real-time delivery tracking.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 justify-center lg:justify-start">
                <Button 
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base font-semibold shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 w-full sm:w-auto"
                  size="lg"
                >
                  Get Started Free
                  <ArrowRight className="ml-2" size={18} />
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base font-semibold transition-all duration-300 w-full sm:w-auto"
                  size="lg"
                >
                  See Pricing
                </Button>
              </div>

              {/* Trust Layer */}
              <div className="pt-4 sm:pt-6 pb-8 sm:pb-12 md:pb-16">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-3 sm:gap-y-4">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">No setup fees</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">Fast Sender ID approval</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">API ready in minutes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual - Modern Dashboard Mockup */}
            <div className="relative max-w-full sm:max-w-lg md:max-w-xl mx-auto lg:mx-0 order-first lg:order-last">
              {/* Dashboard Container */}
              <div className="relative bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden scale-75 sm:scale-90 md:scale-95 lg:scale-100">
                {/* Dashboard Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-xs font-medium text-gray-600">TXTLINK Dashboard</div>
                  <div className="w-16"></div>
                </div>

                {/* Dashboard Content */}
                <div className="p-6 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Messages Sent Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
                      <div className="flex items-center justify-between mb-2">
                        <Send className="w-4 h-4 text-emerald-600" />
                        <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">2.4M</div>
                      <div className="text-xs text-gray-600">Messages sent today</div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>+12% from yesterday</span>
                      </div>
                    </div>

                    {/* Delivery Rate Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">99.2%</div>
                      <div className="text-xs text-gray-600">Delivery rate</div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>All systems operational</span>
                      </div>
                    </div>
                  </div>

                  {/* API Status Card */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">API Status</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Live</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Requests/min</span>
                        <span className="font-semibold text-gray-900">1,247</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Avg response</span>
                        <span className="font-semibold text-gray-900">45ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Sender ID Badge */}
                  <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" />
                        <div>
                          <div className="text-sm font-semibold">Sender ID Approved</div>
                          <div className="text-xs text-emerald-100">TXTLINK • Active</div>
                        </div>
                      </div>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating UI Cards - Hidden on mobile */}
              <div className="hidden md:block absolute -top-4 -right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-20 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">98.7%</div>
                    <div className="text-[10px] text-gray-500">Success rate</div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block absolute -bottom-4 -left-4 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-20 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Real-time</div>
                    <div className="text-[10px] text-gray-500">Delivery tracking</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Trust Section */}
        <div 
          className="relative mt-12 sm:mt-16 md:mt-20 pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 md:pb-20"
          style={{ backgroundColor: '#FAF8F6', borderTop: '1px solid #E5E1DC' }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Eyebrow Text */}
            <p 
              className="text-center mb-3 sm:mb-4 font-medium tracking-wider uppercase"
              style={{ 
                fontSize: '13px',
                color: '#6B6B6B',
                letterSpacing: '0.05em'
              }}
            >
              Trusted by ambitious teams
            </p>
            
            {/* Main Headline */}
            <h2 
              className="text-center mb-8 sm:mb-10 md:mb-12 font-semibold leading-tight px-2"
              style={{ 
                fontSize: 'clamp(22px, 4vw, 28px)',
                color: '#1F1F1F',
                lineHeight: '1.3'
              }}
            >
              Powering{' '}
              <span style={{ color: '#2F6B5F' }}>500+ businesses</span>
              {' '}across fintech, healthcare, and e-commerce
            </h2>
            
            {/* Logo Placeholders - Premium Style */}
            <div className="flex items-center justify-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 flex-wrap">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="rounded-lg flex items-center justify-center"
                  style={{
                    width: 'clamp(100px, 15vw, 140px)',
                    height: 'clamp(50px, 8vw, 70px)',
                    backgroundColor: '#E9E6E2',
                    border: '1px solid #E5E1DC'
                  }}
                >
                  <div 
                    className="rounded"
                    style={{
                      width: '80%',
                      height: '60%',
                      backgroundColor: '#D4D0CA',
                      opacity: 0.6
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-gradient-to-b from-white via-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <p className="text-xs sm:text-sm font-semibold text-teal-600 mb-2 sm:mb-3 uppercase tracking-wider">
              Trusted by Industry Leaders
            </p>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Trusted by leading organizations worldwide
            </h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
              Powering mission-critical communications for enterprises across banking, healthcare, government, and more
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            {[
              { 
                name: 'Finance Bank', 
                type: 'Banking',
                icon: Building,
                gradient: 'from-blue-500 to-blue-600',
                bgGradient: 'from-blue-50 to-blue-100/50',
              },
              { 
                name: 'Global Telecom', 
                type: 'Telecom',
                icon: Phone,
                gradient: 'from-purple-500 to-purple-600',
                bgGradient: 'from-purple-50 to-purple-100/50',
              },
              { 
                name: 'State Services', 
                type: 'Government',
                icon: Flag,
                gradient: 'from-slate-500 to-slate-600',
                bgGradient: 'from-slate-50 to-slate-100/50',
              },
              { 
                name: 'Care Hospitals', 
                type: 'Healthcare',
                icon: Heart,
                gradient: 'from-emerald-500 to-emerald-600',
                bgGradient: 'from-emerald-50 to-emerald-100/50',
              },
              { 
                name: 'Swift Logistics', 
                type: 'Logistics',
                icon: Truck,
                gradient: 'from-orange-500 to-orange-600',
                bgGradient: 'from-orange-50 to-orange-100/50',
              },
            ].map((org) => {
              const IconComponent = org.icon
              return (
                <Card 
                  key={org.name} 
                  className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${org.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="relative p-6 text-center">
                    {/* Logo/Avatar */}
                    <div className="mb-4 flex justify-center">
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${org.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-8 h-8 text-white" strokeWidth={2} />
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                    
                    {/* Company Name */}
                    <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-gray-900 transition-colors">
                      {org.name}
                    </h4>
                    
                    {/* Industry Type */}
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {org.type}
                    </p>
                    
                    {/* Decorative element */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </Card>
              )
            })}
          </div>
          
          {/* Stats Row */}
          <div className="mt-10 sm:mt-12 md:mt-16 pt-8 sm:pt-10 md:pt-12 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1 sm:mb-2">500+</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Enterprise Clients</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1 sm:mb-2">50M+</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Messages/Month</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1 sm:mb-2">99.9%</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Uptime SLA</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1 sm:mb-2">24/7</div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Our Services</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Comprehensive SMS and messaging solutions tailored for enterprise operations
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Radio,
                title: 'Sender ID Registration',
                description:
                  'Register and manage dedicated sender IDs for consistent brand identity and improved deliverability. From KSh 5,000 one-time registration.',
              },
              {
                icon: BarChart3,
                title: 'Bulk SMS',
                description:
                  'Send millions of SMS campaigns with advanced segmentation, scheduling, and real-time analytics.',
              },
              {
                icon: Zap,
                title: 'Transactional SMS',
                description:
                  'Ultra-low latency SMS for OTPs, confirmations, and critical alerts with 99.9% uptime SLA.',
              },
              {
                icon: MessageSquare,
                title: 'Promotional SMS',
                description:
                  'Marketing campaigns with compliance tracking, opt-out management, and audience segmentation.',
              },
              {
                icon: Code,
                title: 'SMS API Integration',
                description:
                  'REST and SMPP APIs for seamless integration into existing applications and workflows.',
              },
              {
                icon: Lock,
                title: 'OTP & Verification',
                description:
                  'Secure one-time passwords for authentication, account verification, and transaction confirmation.',
              },
            ].map((service, idx) => (
              <Card
                key={idx}
                className="p-6 sm:p-8 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-3 rounded-xl bg-teal-100 text-teal-600 w-fit mb-4">
                  <service.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">{service.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {service.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Why Choose TXTLINK</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Enterprise-grade infrastructure built for reliability and compliance
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: BarChart3,
                title: 'High Delivery Rates',
                description: '99.9% SMS delivery rate with intelligent routing across 900+ carriers globally.',
              },
              {
                icon: Shield,
                title: 'Secure Infrastructure',
                description:
                  'Enterprise-grade security with encryption, multi-factor authentication, and real-time threat detection.',
              },
              {
                icon: Radio,
                title: 'Carrier-Grade Routing',
                description:
                  'Direct connections to major carriers ensuring optimal delivery paths and reduced latency.',
              },
              {
                icon: CheckCircle,
                title: 'Regulatory Compliance',
                description:
                  'Full compliance with GDPR, HIPAA, PCI-DSS, and local telecom regulations worldwide.',
              },
              {
                icon: Clock,
                title: '24/7 Enterprise Support',
                description:
                  'Dedicated support team with guaranteed response times and technical expertise.',
              },
              {
                icon: BarChart3,
                title: 'Scalable API',
                description: 'Auto-scaling infrastructure handling millions of messages per second without degradation.',
              },
            ].map((feature, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-600 flex-shrink-0">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API & Developer Section */}
      <section id="api" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-teal-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">For Developers</h2>
              <p className="text-base sm:text-lg text-white/90">
                Powerful APIs designed for seamless integration into any application or platform.
              </p>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  'REST API with comprehensive documentation',
                  'SMPP protocol support for legacy systems',
                  'Real-time webhooks and delivery reports',
                  'Multiple SDKs in Node.js, Python, PHP, and Java',
                  'Sandbox environment for testing',
                  'Rate limiting and usage analytics',
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle size={18} className="flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="bg-white text-teal-600 hover:bg-gray-100 mt-4 w-full sm:w-auto">
                View API Docs <ArrowRight className="ml-2" size={18} />
              </Button>
            </div>

            {/* Code Snippet */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 font-mono text-xs sm:text-sm overflow-x-auto">
              <pre className="text-gray-100">
{`// Send SMS with TXTLINK API
const response = await fetch(
  'https://api.txtlink.io/sms/send',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: '+1234567890',
      message: 'Your OTP is: 123456',
      senderId: 'TXTLINK',
      type: 'transactional'
    })
  }
);

const result = await response.json();
console.log(result.messageId);`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">{pricingData?.pageTitle || 'Transparent Pricing'}</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              {pricingData?.pageSubtitle || 'Scale your messaging without hidden fees or surprise charges'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12">
            {(() => {
              // Default plans (fallback)
              const defaultPlans = [
              {
                name: 'Starter',
                  price: 'KSh 2.50',
                  priceDecimal: '',
                unit: 'per SMS',
                description: 'Perfect for growing businesses',
                  icon: 'Rocket',
                  accentColor: 'teal',
                features: [
                    { text: 'Up to 10,000 SMS/month', category: 'Sending', highlight: false },
                    { text: 'Basic sender ID', category: 'Sending', highlight: false },
                    { text: 'REST API access', category: 'API', highlight: true },
                    { text: 'Email support', category: 'Support', highlight: false },
                    { text: 'Standard routing', category: 'Sending', highlight: false },
                ],
                cta: 'Get Started',
                  ctaSecondary: 'See full API docs',
                highlighted: false,
              },
              {
                name: 'Professional',
                  price: 'KSh 2.00',
                  priceDecimal: '',
                unit: 'per SMS',
                description: 'For established enterprises',
                  icon: 'ShieldCheck',
                  accentColor: 'indigo',
                features: [
                    { text: 'Unlimited SMS', category: 'Sending', highlight: true },
                    { text: 'Dedicated sender ID', category: 'Sending', highlight: false },
                    { text: 'REST + SMPP APIs', category: 'API', highlight: true },
                    { text: 'Priority 24/7 support', category: 'Support', highlight: false },
                    { text: 'Advanced analytics', category: 'Support', highlight: false },
                    { text: 'Carrier optimization', category: 'Sending', highlight: false },
                ],
                cta: 'Request Demo',
                  ctaSecondary: 'Compare plans',
                highlighted: true,
                  highlightReason: 'Best balance of cost + deliverability',
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                  priceDecimal: '',
                unit: 'pricing',
                description: 'For large-scale operations',
                  icon: 'Building2',
                  accentColor: 'slate',
                features: [
                    { text: 'Unlimited everything', category: 'Sending', highlight: true },
                    { text: 'Multiple sender IDs', category: 'Sending', highlight: false },
                    { text: 'Custom integrations', category: 'API', highlight: true },
                    { text: 'Dedicated account manager', category: 'Support', highlight: false },
                    { text: 'SLA guarantee', category: 'Support', highlight: false },
                    { text: 'Custom infrastructure', category: 'Sending', highlight: false },
                ],
                cta: 'Contact Sales',
                  ctaSecondary: 'Talk to an engineer',
                highlighted: false,
              },
              ]
              
              const plans = pricingData?.tiers || defaultPlans

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

              const groupedFeatures = (features: typeof plans[0]['features']) => {
                const groups: Record<string, typeof features> = {}
                features.forEach((feature) => {
                  if (!groups[feature.category]) {
                    groups[feature.category] = []
                  }
                  groups[feature.category].push(feature)
                })
                return groups
              }

              return plans.map((plan: any) => {
                const IconComponent = iconMap[plan.icon] || Rocket
                const featureGroups = groupedFeatures(plan.features)
                const isHighlighted = plan.highlighted

                return (
                  <div
                    key={plan.name}
                    className={`relative group transition-all duration-300 ${
                      isHighlighted ? 'md:-mt-4 md:mb-4' : ''
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
                      className={`relative overflow-hidden flex flex-col h-full transition-all duration-300 ${
                        isHighlighted
                          ? `bg-gradient-to-b from-teal-50/50 via-white to-white border-2 ${getCardBorder(plan.accentColor, true)} shadow-xl hover:shadow-2xl hover:scale-[1.02]`
                          : `bg-white border ${getCardBorder(plan.accentColor, false)} shadow-md hover:shadow-xl hover:-translate-y-1`
                      }`}
                    >
                      {/* Decorative Background Blob */}
                      <div
                        className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${getAccentGradient(plan.accentColor)} rounded-full blur-3xl opacity-40 -z-0`}
                      ></div>
                      <div
                        className={`absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr ${getAccentGradient(plan.accentColor)} rounded-full blur-2xl opacity-30 -z-0`}
                      ></div>

                      {/* Card Content */}
                      <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full">
                        {/* Plan Identity Row */}
                <div className="mb-4 sm:mb-6">
                          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${getIconBgGradient(plan.accentColor)} flex items-center justify-center shadow-lg`}
                            >
                              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{plan.name}</h3>
                              <p className="text-xs text-gray-500 mt-0.5 font-medium">{plan.description}</p>
                            </div>
                          </div>
                          {isHighlighted && plan.highlightReason && (
                            <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md w-fit">
                              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="font-medium">{plan.highlightReason}</span>
                            </div>
                          )}
                </div>

                        {/* Price Section */}
                <div className="mb-6 sm:mb-8">
                          <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                            <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">{plan.price}</span>
                            {plan.priceDecimal && (
                              <span className="text-xl sm:text-2xl font-semibold text-gray-500">{plan.priceDecimal}</span>
                            )}
                            <span className="text-xs sm:text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                              {plan.unit}
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
                            href={plan.name === 'Enterprise' ? '/contact' : '/auth/register'}
                            className="block"
                          >
                <Button
                              className={`w-full ${getButtonGradient(plan.accentColor, isHighlighted)} group/btn transition-all duration-300`}
                              size="lg"
                            >
                              <span>{plan.cta}</span>
                              <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Button>
                          </Link>
                          <Link
                            href={plan.name === 'Enterprise' ? '/contact' : '/docs'}
                            className="block text-center"
                          >
                            <span className="text-xs text-gray-500 hover:text-teal-600 transition-colors cursor-pointer">
                              {plan.ctaSecondary} →
                            </span>
                          </Link>
                        </div>
                      </div>

                      {/* Hover Glow Effect */}
                      <div
                        className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                          isHighlighted
                            ? 'ring-4 ring-teal-500/20'
                            : plan.accentColor === 'indigo'
                            ? 'ring-2 ring-indigo-500/20'
                            : plan.accentColor === 'slate'
                            ? 'ring-2 ring-slate-500/20'
                            : 'ring-2 ring-teal-500/20'
                        }`}
                      ></div>
              </Card>
                  </div>
                )
              })
            })()}
          </div>

          {/* Premium Sender ID Pricing Block */}
          <div 
            className="mt-12 sm:mt-16 md:mt-20 pt-12 sm:pt-16 md:pt-20 border-t"
            style={{ borderColor: '#E5E1DC', backgroundColor: '#F8F7F4' }}
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              {/* Eyebrow */}
              <div className="text-center mb-4">
                <p 
                  className="text-xs sm:text-sm font-medium uppercase tracking-wider"
                  style={{ color: '#0F9D8A', letterSpacing: '0.1em' }}
                >
                  Sender ID Setup
                </p>
              </div>

              {/* Header */}
              <div className="text-center mb-10 sm:mb-12">
                <h3 
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                  style={{ color: '#0F172A' }}
                >
                  Sender ID Pricing & Approval
                </h3>
                <p 
                  className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto"
                  style={{ color: '#475569' }}
                >
                  Simple, transparent pricing for Sender ID registration and approval support.
                </p>
              </div>

              {/* Premium Pricing Card */}
              <Card 
                className="bg-white shadow-xl overflow-hidden"
                style={{ 
                  border: '1px solid #D9F2EC',
                  borderRadius: '20px'
                }}
              >
                <div className="p-8 sm:p-10 md:p-12">
                  {/* Icon Badge & Label */}
                  <div className="text-center mb-6">
                    <div 
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                      style={{ backgroundColor: '#D9F2EC' }}
                    >
                      <Radio className="w-6 h-6" style={{ color: '#0F9D8A' }} />
                    </div>
                    <p 
                      className="text-sm font-medium mb-6"
                      style={{ color: '#475569' }}
                    >
                      One-time registration fee
                    </p>

                    {/* Price - Dominant Visual */}
                    <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span 
                        className="text-5xl sm:text-6xl md:text-7xl font-bold"
                        style={{ color: '#0F172A' }}
                      >
                        KSh {senderIdPricing?.registrationFee?.toLocaleString() || '5,000'}
                      </span>
                    </div>
                    <p 
                      className="text-sm font-medium"
                      style={{ color: '#64748B' }}
                    >
                      One-time payment
                    </p>
                  </div>

                  {/* Description */}
                  <p 
                    className="text-base max-w-md mx-auto leading-relaxed"
                    style={{ color: '#475569' }}
                  >
                    {senderIdPricing?.description || 'One-time setup fee for new Sender ID registration and approval processing. No annual renewal fees.'}
                  </p>
                  </div>

                  {/* Mini Cards - Approval Timeline & Documents */}
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mt-10 sm:mt-12">
                    {/* Approval Timeline Card */}
                    <div 
                      className="p-5 sm:p-6 rounded-xl"
                      style={{ backgroundColor: '#F8F7F4', border: '1px solid #E5E1DC' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: '#D9F2EC' }}
                        >
                          <CheckCircle2 className="w-5 h-5" style={{ color: '#0F9D8A' }} />
                        </div>
                        <h4 
                          className="text-base font-semibold"
                          style={{ color: '#0F172A' }}
                        >
                          Approval Timeline
                        </h4>
                      </div>
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ color: '#475569' }}
                      >
                        {senderIdPricing?.approvalTimeline || '3–5 business days after document submission'}
                      </p>
                    </div>

                    {/* Required Documents Card */}
                    <div 
                      className="p-5 sm:p-6 rounded-xl"
                      style={{ backgroundColor: '#F8F7F4', border: '1px solid #E5E1DC' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: '#D9F2EC' }}
                        >
                          <Shield className="w-5 h-5" style={{ color: '#0F9D8A' }} />
                        </div>
                        <h4 
                          className="text-base font-semibold"
                          style={{ color: '#0F172A' }}
                        >
                          Required Documents
                        </h4>
                      </div>
                      <ul 
                        className="text-sm leading-relaxed space-y-1"
                        style={{ color: '#475569' }}
                      >
                        {(senderIdPricing?.requiredDocuments || [
                          'Business registration certificate',
                          'Company letterhead',
                          'Authorized signatory ID',
                        ]).map((doc: string, idx: number) => (
                          <li key={idx}>• {doc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Buttons - Better Hierarchy */}
                  <div className="mt-10 sm:mt-12 pt-8 border-t" style={{ borderColor: '#E5E1DC' }}>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                      {/* Primary CTA */}
                      <Link href="/auth/register" className="w-full sm:w-auto">
                        <Button 
                          className="w-full sm:w-auto px-8 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                          style={{ 
                            backgroundColor: '#0F9D8A',
                            color: 'white'
                          }}
                        >
                          Apply for Sender ID
                          <ArrowRight className="ml-2" size={18} />
                        </Button>
                      </Link>
                      {/* Secondary CTA */}
                      <Link href="/sender-id" className="w-full sm:w-auto">
                        <Button 
                          variant="outline"
                          className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-white hover:bg-gray-50 transition-all"
                          style={{ 
                            border: '1px solid #DDE7E5',
                            color: '#0F172A'
                          }}
                        >
                          Learn More
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Trust Row */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="font-medium">Carrier-grade routing</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="font-medium">99.9% uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="font-medium">SLA available</span>
              </div>
            </div>
          </div>

          {/* Compare Features Link */}
          <div className="text-center">
            <Link
              href="/pricing#compare"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Compare all features</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Compliance & Security Section */}
      <section className="py-12 sm:py-14 md:py-16 px-4 sm:px-6 border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-10 md:mb-12">
            Compliance & Security
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: '🔐', label: 'GDPR Compliant', desc: 'Full data protection compliance' },
              { icon: '⚕️', label: 'HIPAA Certified', desc: 'Healthcare industry standards' },
              { icon: '💳', label: 'PCI-DSS Level 1', desc: 'Highest payment security' },
              { icon: '📋', label: 'Carrier Approved', desc: 'Approved by major carriers' },
            ].map((cert, idx) => (
              <div key={idx} className="text-center p-4 sm:p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{cert.icon}</div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2">{cert.label}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{cert.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Start Sending SMS at Scale
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">
            Join hundreds of enterprises using TXTLINK for reliable, compliant messaging
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button className="bg-teal-600 text-white hover:bg-teal-700 px-6 sm:px-10 py-5 sm:py-6 text-sm sm:text-base font-semibold w-full sm:w-auto">
              Create Account 
              <ArrowRight className="ml-2" size={18} />
            </Button>
            <Button className="bg-teal-600 text-white hover:bg-teal-700 px-6 sm:px-10 py-5 sm:py-6 text-sm sm:text-base font-semibold w-full sm:w-auto">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}

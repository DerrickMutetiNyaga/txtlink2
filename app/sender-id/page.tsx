'use client'

import { useState, useEffect } from 'react'
import { MarketingLayout } from '@/components/marketing-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Radio,
  Shield,
  CheckCircle2,
  FileText,
  ArrowRight,
  Zap,
  BarChart3,
  Building2,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

export default function SenderIdPage() {
  const [senderIdPricing, setSenderIdPricing] = useState<any>(null)

  useEffect(() => {
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
    
    fetchSenderIdPricing()
  }, [])
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 border-b border-gray-200 bg-gradient-to-b from-white via-teal-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6">
              <Radio className="w-4 h-4" />
              <span>Verified Sender ID Registration</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Send SMS with Your Brand Name
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Register a dedicated Sender ID to build trust, improve deliverability, and maintain consistent brand identity across all your SMS communications.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button className="bg-teal-600 text-white hover:bg-teal-700 px-8 py-6 text-base font-semibold shadow-lg">
                  Apply for Sender ID
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-base font-semibold">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What is Sender ID Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                What is a Sender ID?
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed">
                A Sender ID is the name or number that appears as the sender when your SMS messages are delivered. Instead of showing a random phone number, your messages display your brand name (e.g., "TXTLINK" or "YOURBRAND").
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed">
                This creates instant brand recognition, increases open rates, and builds trust with your customers. Sender IDs are registered with telecom carriers and require approval to ensure compliance and prevent spam.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Improves message deliverability by up to 15%</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Builds brand recognition and trust</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Required for enterprise and transactional messaging</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-8 sm:p-10 border border-teal-100">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <span className="text-sm text-gray-500">From</span>
                    <span className="text-2xl font-bold text-gray-900">TXTLINK</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p className="font-medium text-gray-900">Your OTP code is: 123456</p>
                    <p className="text-xs text-gray-500">Valid for 5 minutes. Do not share this code.</p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      ✓ Sent via verified Sender ID
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Sender ID Matters
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional messaging that builds trust and drives engagement
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'Higher Deliverability',
                description: 'Verified Sender IDs are trusted by carriers, resulting in better inbox placement and fewer blocked messages.',
              },
              {
                icon: Building2,
                title: 'Brand Recognition',
                description: 'Your customers instantly recognize your brand name, increasing trust and message open rates.',
              },
              {
                icon: Shield,
                title: 'Compliance Ready',
                description: 'Meet regulatory requirements for transactional and promotional messaging across all markets.',
              },
              {
                icon: Zap,
                title: 'Professional Image',
                description: 'Project a professional, established brand image instead of anonymous phone numbers.',
              },
              {
                icon: BarChart3,
                title: 'Better Engagement',
                description: 'Messages from recognized brands have significantly higher open and response rates.',
              },
              {
                icon: CheckCircle2,
                title: 'Enterprise Standard',
                description: 'Required for enterprise SMS programs, banking, healthcare, and government communications.',
              },
            ].map((benefit, idx) => (
              <Card key={idx} className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-teal-100 text-teal-600 w-fit mb-4">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Approval Process Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple Approval Process
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Fast-track approval in 3-5 business days with our streamlined process
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  step: '1',
                  title: 'Submit Application',
                  description: 'Fill out the Sender ID registration form with your business details and desired sender name.',
                  icon: FileText,
                },
                {
                  step: '2',
                  title: 'Upload Documents',
                  description: 'Provide business registration certificate, company letterhead, and authorized signatory ID.',
                  icon: Shield,
                },
                {
                  step: '3',
                  title: 'Review & Approval',
                  description: 'Our team reviews your application and submits to carriers. Typical approval: 3-5 business days.',
                  icon: CheckCircle2,
                },
                {
                  step: '4',
                  title: 'Activation',
                  description: 'Once approved, your Sender ID is activated and ready to use immediately.',
                  icon: Zap,
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-3 mb-2">
                      <step.icon className="w-5 h-5 text-teal-600" />
                      <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Pricing Section */}
      <section 
        id="pricing" 
        className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 border-b"
        style={{ borderColor: '#E5E1DC', backgroundColor: '#F8F7F4' }}
      >
        <div className="max-w-3xl mx-auto">
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
            <h2 
              className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
              style={{ color: '#0F172A' }}
            >
              Sender ID Pricing & Approval
            </h2>
            <p 
              className="text-base sm:text-lg max-w-xl mx-auto"
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
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
                  style={{ backgroundColor: '#D9F2EC' }}
                >
                  <Radio className="w-7 h-7" style={{ color: '#0F9D8A' }} />
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
                  {senderIdPricing?.description || 'One-time setup fee for new Sender ID registration and approval processing. Includes carrier submission and initial approval. No annual renewal fees.'}
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
                      {senderIdPricing?.approvalTimeline || '3–5 business days after complete document submission. Expedited processing available.'}
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
                      className="text-sm space-y-1.5 leading-relaxed"
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
                      <ArrowRight className="ml-2" size={20} />
                    </Button>
                  </Link>
                  {/* Secondary CTA */}
                  <Link href="/contact">
                    <Button 
                      variant="outline"
                      className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-white hover:bg-gray-50 transition-all"
                      style={{ 
                        border: '1px solid #DDE7E5',
                        color: '#0F172A'
                      }}
                    >
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to Get Your Sender ID?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join 500+ businesses using verified Sender IDs for professional SMS communications
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button className="bg-teal-600 text-white hover:bg-teal-700 px-8 py-6 text-base font-semibold shadow-lg">
                Get Started Free
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-base font-semibold">
                View Full Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}


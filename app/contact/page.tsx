'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Send,
  Clock,
  Globe,
  ArrowRight,
  CheckCircle2,
  Headphones,
  FileText,
  Shield,
  DollarSign,
  BookOpen,
  AlertCircle,
  Loader2,
  Upload,
  ExternalLink,
  CheckCircle,
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    topic: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleTopicChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      topic: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSubmitted(true)
    setIsSubmitting(false)
    setTimeout(() => setSubmitted(false), 5000)
  }

  const contactOptions = [
    {
      icon: DollarSign,
      title: 'Sales',
      description: 'Enterprise plans, pricing, and partnerships',
      responseTime: '~4 hours',
      action: 'mailto:sales@signalhub.io',
      actionText: 'Email Sales',
    },
    {
      icon: Headphones,
      title: 'Technical Support',
      description: 'API integration, technical issues, and troubleshooting',
      responseTime: '~2 hours',
      action: 'mailto:info@txtlink.co.ke',
      actionText: 'Email Support',
    },
    {
      icon: MessageSquare,
      title: 'General Inquiries',
      description: 'Questions about services, features, or general information',
      responseTime: '~24 hours',
      action: 'mailto:info@signalhub.io',
      actionText: 'Email Us',
    },
  ]

  const faqs = [
    {
      question: 'How fast do you respond?',
      answer:
        'We respond to sales inquiries within 4 hours, technical support within 2 hours, and general inquiries within 24 hours during business hours (Mon-Fri 8:00-18:00 EAT).',
    },
    {
      question: 'Do you offer WhatsApp/voice too?',
      answer:
        'Currently, we specialize in SMS messaging. We offer REST API and SMPP protocols for SMS delivery. WhatsApp and voice services are not available at this time.',
    },
    {
      question: 'How do Sender ID approvals work?',
      answer:
        'Sender ID registration typically takes 1-3 business days. You submit your desired Sender ID through the dashboard, we review it for compliance, and once approved, it becomes available for use. Some regions may require additional documentation.',
    },
    {
      question: 'Where do I find my API key?',
      answer:
        'After signing in, navigate to Settings → API Keys in your dashboard. You can create new keys, view existing ones (first 8 characters), and revoke keys as needed. Remember to keep your keys secure and never commit them to version control.',
    },
    {
      question: 'How do webhooks work?',
      answer:
        'Webhooks allow you to receive real-time delivery status updates. Configure your webhook URL in Settings → Webhooks, and we\'ll send POST requests to your endpoint when message status changes. All webhook payloads are signed for security verification.',
    },
    {
      question: 'Do you support SLAs?',
      answer:
        'Yes, we offer Service Level Agreements (SLAs) for Enterprise customers. SLAs include uptime guarantees (99.9%), response time commitments, and dedicated support. Contact our sales team to discuss SLA options for your use case.',
    },
  ]

  return (
    <MarketingLayout>
      <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Support Status Pill */}
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 hidden md:block">
          <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-full text-xs font-medium border border-slate-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems operational</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="pt-8 sm:pt-12 pb-12 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
          {/* Background Treatment */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Title + Copy + CTA + Trust Badges */}
              <div
                className="space-y-6"
                style={{
                  animation: 'fadeInUp 0.6s ease-out both',
                }}
              >
                {/* Eyebrow Badge */}
                <div className="inline-flex items-center gap-2 bg-teal-50 text-[#0F766E] px-4 py-2 rounded-full text-sm font-medium border border-teal-200/50">
                  <MessageSquare className="w-4 h-4" />
                  <span>Get in touch</span>
                </div>

                <h1 className="text-[clamp(1.75rem,5vw,3.75rem)] font-bold text-[#0B1220] mb-4 leading-tight tracking-tight">
                  Contact TXTLINK
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-[#334155] mb-6 sm:mb-8 leading-relaxed">
                  Enterprise SMS solutions with carrier-grade delivery. We respond fast—usually within 2 hours.
                </p>

                {/* Trust Signals */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>99.9% uptime SLA</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Avg response: 2 hrs</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#334155] text-xs font-medium rounded-full border border-slate-200 shadow-sm">
                    <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>SOC2-ready • GDPR</span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link href="#contact-form" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-[#0F766E] text-white hover:bg-[#115E59] px-6 sm:px-8 h-12 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200">
                      Contact Sales
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right: Contact Summary Card */}
              <div
                className="lg:block hidden"
                style={{
                  animation: 'fadeInUp 0.6s ease-out 0.2s both',
                }}
              >
                <Card className="p-6 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0B1220]">Avg response time</p>
                        <p className="text-sm text-[#64748B]">2 hours</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0B1220]">Support hours</p>
                        <p className="text-sm text-[#64748B]">Mon–Sat, 8:00–18:00 EAT</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0B1220]">Location</p>
                        <p className="text-sm text-[#64748B]">Nairobi, Kenya</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0B1220]">Email</p>
                        <a href="mailto:info@txtlink.co.ke" className="text-sm text-[#0F766E] hover:underline">
                          info@txtlink.co.ke
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Options Cards */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0B1220] mb-4">How can we help?</h2>
              <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
                Choose the right channel for your inquiry
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {contactOptions.map((option, index) => {
                const IconComponent = option.icon
                return (
                  <Card
                    key={index}
                    className="group p-5 sm:p-6 lg:p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md hover:border-[#0F766E]/20 hover:bg-slate-50 transition-all duration-200"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1 + 0.2}s both`,
                    }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-5 group-hover:bg-[#0F766E]/10 transition-colors duration-200">
                      <IconComponent className="w-7 h-7 text-[#0F766E]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#0B1220] mb-3">{option.title}</h3>
                    <p className="text-sm text-[#64748B] mb-5 leading-relaxed">{option.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 border-t border-slate-100">
                      <span className="text-xs font-semibold text-[#0F766E] bg-[#ECFDF5] px-3 py-1.5 rounded-md w-fit">
                        {option.responseTime}
                      </span>
                      <a
                        href={option.action}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:text-[#115E59] transition-colors duration-200 group-hover:gap-2"
                      >
                        {option.actionText}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Main Section - Split Layout */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-white border-y border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Left: Contact Form */}
              <div className="lg:col-span-2 min-w-0" id="contact-form">
                <Card className="p-5 sm:p-6 md:p-8 lg:p-10 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1220] mb-2">Send us a message</h2>
                  <p className="text-[#64748B] mb-8">Fill out the form below and we'll get back to you soon.</p>

                  {submitted ? (
                    <div className="p-8 bg-[#ECFDF5] border border-[#0F766E]/20 rounded-2xl">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#0F766E] flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-[#0B1220] mb-2">
                            Message sent!
                          </h3>
                          <p className="text-[#334155] mb-4">
                            Thank you for contacting us. We'll get back to you within 2 hours.
                          </p>
                          <p className="text-sm text-[#64748B]">
                            Next steps: Check your email for a confirmation. Our team will review
                            your message and respond accordingly.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="John Doe"
                            className="bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl h-12 px-4 text-[#0B1220] placeholder:text-slate-400 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="john@company.com"
                            className="bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl h-12 px-4 text-[#0B1220] placeholder:text-slate-400 transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                            Company
                          </label>
                          <Input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="Your company name"
                            className="bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl h-12 px-4 text-[#0B1220] placeholder:text-slate-400 transition-all duration-200"
                          />
                          <p className="text-xs text-[#64748B] mt-1.5">Optional</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                            Phone
                          </label>
                          <Input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+254 7XX XXX XXX"
                            className="bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl h-12 px-4 text-[#0B1220] placeholder:text-slate-400 transition-all duration-200"
                          />
                          <p className="text-xs text-[#64748B] mt-1.5">Optional</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                          Topic <span className="text-red-500">*</span>
                        </label>
                        <Select value={formData.topic} onValueChange={handleTopicChange} required>
                          <SelectTrigger className="bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl h-12 px-4 text-[#0B1220] transition-all duration-200">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales & Pricing</SelectItem>
                            <SelectItem value="support">Technical Support</SelectItem>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                          Message <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={8}
                          placeholder="Tell us how we can help..."
                          className="bg-slate-50 border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10 rounded-xl px-4 py-3 text-[#0B1220] placeholder:text-slate-400 resize-none transition-all duration-200 min-h-[140px]"
                        />
                        <p className="text-xs text-[#64748B] mt-2">
                          Include details like your account email, sender ID, or message ID if relevant.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#0B1220] mb-2">
                          Attach file <span className="text-xs font-normal text-[#64748B]">(optional)</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-[#E2E8F0] rounded-xl hover:bg-slate-100 transition-colors duration-200">
                              <Upload className="w-4 h-4 text-[#64748B]" />
                              <span className="text-sm text-[#64748B]">Choose file or drag and drop</span>
                            </div>
                            <input type="file" className="hidden" />
                          </label>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1.5">Max file size: 10MB</p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#0F766E] text-white hover:bg-[#115E59] h-12 text-base font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send message
                            <Send className="ml-2 w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </Card>
              </div>

              {/* Right: Help Center - Sticky on Desktop */}
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Need Immediate Help */}
                <Card className="p-6 bg-[#ECFDF5] border border-[#0F766E]/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-[#0F766E]" />
                    <h3 className="text-lg font-semibold text-[#0B1220]">
                      Need immediate help?
                    </h3>
                  </div>
                  <p className="text-sm text-[#64748B] mb-4">
                    Get in touch with our support team right away.
                  </p>
                  <div className="space-y-3">
                    <a
                      href="tel:+254794269051"
                      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#0F766E] hover:bg-white hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center group-hover:bg-[#0F766E]/10 transition-colors">
                        <Phone className="w-5 h-5 text-[#0F766E]" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[#0B1220] block">Call Support</span>
                        <span className="text-xs text-[#64748B]">+254 794 269 051</span>
                      </div>
                    </a>
                    <a
                      href="mailto:info@txtlink.co.ke"
                      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#0F766E] hover:bg-white hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] flex items-center justify-center group-hover:bg-[#0F766E]/10 transition-colors">
                        <Mail className="w-5 h-5 text-[#0F766E]" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[#0B1220] block">Email Support</span>
                        <span className="text-xs text-[#64748B]">info@txtlink.co.ke</span>
                      </div>
                    </a>
                  </div>
                </Card>

                {/* Quick Links */}
                <Card className="p-6 bg-white border border-[#E2E8F0] rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-[#64748B]" />
                    <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">
                      Quick Links
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    <li>
                      <Link
                        href="/developers"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#334155] hover:text-[#0F766E] hover:bg-slate-50 transition-all duration-200 group"
                      >
                        <BookOpen className="w-4 h-4 text-[#64748B] group-hover:text-[#0F766E]" />
                        <span>API Docs</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/status"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#334155] hover:text-[#0F766E] hover:bg-slate-50 transition-all duration-200 group"
                      >
                        <AlertCircle className="w-4 h-4 text-[#64748B] group-hover:text-[#0F766E]" />
                        <span>Status Page</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/pricing"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#334155] hover:text-[#0F766E] hover:bg-slate-50 transition-all duration-200 group"
                      >
                        <DollarSign className="w-4 h-4 text-[#64748B] group-hover:text-[#0F766E]" />
                        <span>Pricing</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  </ul>
                </Card>

                {/* What to Include */}
                <Card className="p-6 bg-white border border-[#E2E8F0] rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-[#64748B]" />
                    <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">
                      What to include
                    </h3>
                  </div>
                  <ul className="space-y-3 text-sm text-[#334155]">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <span>Account email</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <span>Sender ID (if applicable)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <span>Message ID (for support)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] mt-0.5 flex-shrink-0" />
                      <span>Timeframe or urgency</span>
                    </li>
                  </ul>
                </Card>

                {/* Security Note */}
                <Card className="p-5 bg-slate-50 border border-[#E2E8F0] rounded-xl">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-[#0F766E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[#0B1220] mb-1">Security note</p>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        We typically respond within 2 hours. Sensitive info is encrypted and handled securely.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Office & Hours */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0B1220] mb-4">Visit our office</h2>
              <p className="text-lg text-[#64748B]">We're based in Nairobi, Kenya</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <Card className="p-5 sm:p-6 lg:p-8 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-7 h-7 text-[#0F766E]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0B1220] mb-1">Location</h3>
                    <p className="text-[#334155] font-medium">Nairobi, Kenya</p>
                    <p className="text-sm text-[#64748B] mt-1">EAT (East Africa Time)</p>
                    <a
                      href="https://maps.google.com/?q=Nairobi,Kenya"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#0F766E] hover:text-[#115E59] mt-3 font-medium transition-colors"
                    >
                      Get directions
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-[#0B1220]">Monday - Friday</span>
                    <span className="text-sm font-medium text-[#0F766E]">8:00 - 18:00 EAT</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-[#0B1220]">Saturday</span>
                    <span className="text-sm font-medium text-[#0F766E]">9:00 - 13:00 EAT</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-semibold text-[#0B1220]">Sunday</span>
                    <span className="text-sm text-[#64748B]">Closed</span>
                  </div>
                </div>
              </Card>

              {/* Map Placeholder */}
              <Card className="p-0 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
                <div className="relative h-full min-h-[300px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px]" />
                  <div className="relative text-center z-10">
                    <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-[#0F766E]" />
                    </div>
                    <p className="text-sm font-semibold text-[#0B1220]">Nairobi, Kenya</p>
                    <p className="text-xs text-[#64748B] mt-1">Map preview</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-white border-y border-[#E2E8F0]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0B1220] mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-[#64748B]">Common questions about TXTLINK</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-[#E2E8F0] rounded-xl px-4 sm:px-6 data-[state=open]:bg-slate-50/50 hover:bg-slate-50/30 transition-all duration-200"
                >
                  <AccordionTrigger className="text-left font-semibold text-[#0B1220] hover:no-underline py-5 text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#334155] pb-5 leading-relaxed text-sm">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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

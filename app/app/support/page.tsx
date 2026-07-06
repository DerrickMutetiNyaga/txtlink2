'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HelpCircle, MessageCircle, Book, Mail, Phone, Send } from 'lucide-react'

export default function SupportPage() {
  const supportOptions = [
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      action: 'Start Chat',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      action: 'Send Email',
      color: 'from-[#059669] to-[#14B8A6]',
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Call us for urgent issues',
      action: 'Call Now',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Book,
      title: 'Documentation',
      description: 'Browse our comprehensive guides and API docs',
      action: 'View Docs',
      color: 'from-blue-500 to-indigo-500',
    },
  ]

  const faqs = [
    {
      question: 'How do I send my first SMS?',
      answer: 'Navigate to Send SMS, enter the recipient number and message, then click Send.',
    },
    {
      question: 'What is a Sender ID?',
      answer: 'A Sender ID is the name that appears as the sender of your SMS messages. It must be approved before use.',
    },
    {
      question: 'How are SMS costs calculated?',
      answer: 'SMS costs are calculated per segment. Each 160 characters equals one segment at KSh 2.00 per segment.',
    },
    {
      question: 'Can I schedule SMS messages?',
      answer: 'Yes, you can schedule messages for future delivery using the scheduling feature in Send SMS.',
    },
  ]

  return (
    <PortalLayout activeSection="Support">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">Support Center</h1>
          <p className="text-slate-600">We're here to help you succeed with TXTLINK</p>
        </div>

        {/* Support Options */}
<<<<<<< HEAD
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
=======
        <div className="grid md:grid-cols-2 gap-6">
>>>>>>> 4a3d95970903f9fc28665c46227114641494cea8
          {supportOptions.map((option, idx) => (
            <Card key={idx} className="p-6 bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className={`p-4 rounded-xl bg-gradient-to-br ${option.color} w-fit mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <option.icon size={28} className="text-white" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">{option.title}</h3>
              <p className="text-slate-600 mb-4">{option.description}</p>
              <Button className={`bg-gradient-to-r ${option.color} text-white hover:shadow-lg transition-all`}>
                {option.action}
              </Button>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-semibold text-[#1F2937] mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="p-6 bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <HelpCircle size={20} className="text-[#059669]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-2">{faq.question}</h3>
                    <p className="text-slate-600">{faq.answer}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <Card className="p-8 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#059669] to-[#14B8A6]">
              <Send size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-[#1F2937]">Send us a Message</h2>
          </div>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
              <input
                type="text"
                placeholder="What can we help you with?"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669]/50 focus:border-[#059669]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
              <textarea
                rows={6}
                placeholder="Tell us more about your question or issue..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#059669]/50 focus:border-[#059669] resize-none"
              />
            </div>
            <Button className="bg-gradient-to-r from-[#059669] to-[#14B8A6] text-white hover:shadow-lg transition-all">
              <Send size={18} className="mr-2" /> Send Message
            </Button>
          </form>
        </Card>
      </div>
    </PortalLayout>
  )
}


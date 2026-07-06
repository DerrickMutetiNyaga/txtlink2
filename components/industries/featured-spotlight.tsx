'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { CodeBlock } from '@/components/docs/code-block'

interface Flow {
  name: string
  description: string
}

interface SpotlightData {
  title: string
  description: string
  flows: Flow[]
  codeExample: string
}

const spotlightData: Record<string, SpotlightData> = {
  banking: {
    title: 'Banking & Fintech',
    description:
      'Secure, PCI-DSS compliant messaging for transaction alerts, OTP verification, and fraud prevention. Built for financial institutions that require the highest levels of security and compliance.',
    flows: [
      {
        name: 'OTP Verification',
        description: 'Secure one-time passwords for login and transaction confirmation',
      },
      {
        name: 'Transaction Alerts',
        description: 'Real-time notifications for payments, withdrawals, and account activity',
      },
      {
        name: 'Fraud Alerts',
        description: 'Immediate notifications for suspicious account activity',
      },
    ],
    codeExample: `// Send OTP for transaction
const result = await client.sms.send({
  to: '+254712345678',
  message: 'Your OTP is 123456. Valid for 5 minutes.',
  senderId: 'BANKNAME',
  type: 'OTP'
});`,
  },
  healthcare: {
    title: 'Healthcare',
    description:
      'HIPAA-compliant messaging for appointment reminders, test results, and patient communications. Ensure timely patient engagement while maintaining strict privacy standards.',
    flows: [
      {
        name: 'Appointment Reminders',
        description: 'Automated reminders 24 hours before scheduled appointments',
      },
      {
        name: 'Lab Results',
        description: 'Secure delivery of test results and medical reports',
      },
      {
        name: 'Medication Reminders',
        description: 'Daily reminders for prescription medications',
      },
    ],
    codeExample: `// Send appointment reminder
const result = await client.sms.send({
  to: '+254712345678',
  message: 'Reminder: Your appointment is tomorrow at 2 PM.',
  senderId: 'CLINIC',
  type: 'TRANSACTIONAL'
});`,
  },
  logistics: {
    title: 'Logistics & E-commerce',
    description:
      'Order confirmations, shipping updates, and delivery notifications that keep customers informed throughout their journey. Reduce support inquiries and improve customer satisfaction.',
    flows: [
      {
        name: 'Order Confirmations',
        description: 'Instant confirmation when orders are placed',
      },
      {
        name: 'Shipping Updates',
        description: 'Real-time tracking updates as packages move',
      },
      {
        name: 'Delivery Notifications',
        description: 'Alerts when packages are delivered',
      },
    ],
    codeExample: `// Send shipping update
const result = await client.sms.send({
  to: '+254712345678',
  message: 'Your order #12345 has shipped! Track: example.com/track',
  senderId: 'STORE',
  type: 'TRANSACTIONAL'
});`,
  },
}

export function FeaturedSpotlight() {
  const [activeTab, setActiveTab] = useState<'banking' | 'healthcare' | 'logistics'>('banking')
  const data = spotlightData[activeTab]

  return (
    <Card className="p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Featured Industry Spotlight</h2>
        <p className="text-slate-600">See how TXTLINK powers industry-specific messaging workflows</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        {(['banking', 'healthcare', 'logistics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === tab
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }
            `}
          >
            {spotlightData[tab].title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        <p className="text-slate-600 leading-relaxed">{data.description}</p>

        {/* Recommended Flows */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
            Recommended Flows
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {data.flows.map((flow, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200/60">
                <h4 className="font-semibold text-slate-900 mb-1">{flow.name}</h4>
                <p className="text-sm text-slate-600">{flow.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Code Example */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
            Example Integration
          </h3>
          <CodeBlock code={data.codeExample} language="javascript" />
        </div>
      </div>
    </Card>
  )
}


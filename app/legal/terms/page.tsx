'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { FileText, Scale, AlertCircle, Shield, CreditCard, Ban } from 'lucide-react'

export default function TermsOfServicePage() {
  const lastUpdated = 'January 2026'

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-6">
              <Scale className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-gray-600">
              Last updated: {lastUpdated}
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white shadow-lg">
            <div className="prose prose-slate max-w-none">
              {/* Introduction */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-teal-600" />
                  1. Agreement to Terms
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and TXTLINK ("Company," "we," "us," or "our") regarding your use of our SMS messaging platform and services (the "Service").
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.
                </p>
              </section>

              {/* Description of Service */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  TXTLINK provides an enterprise SMS messaging platform that enables businesses to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Send SMS messages to customers and users</li>
                  <li>Register and manage sender IDs</li>
                  <li>Access SMS delivery reports and analytics</li>
                  <li>Integrate SMS functionality via REST API</li>
                  <li>Manage webhooks for delivery notifications</li>
                </ul>
              </section>

              {/* Account Registration */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Account Requirements</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  To use our Service, you must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Be at least 18 years old</li>
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your account information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Account Security</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Maintaining the confidentiality of your account password</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Using strong passwords and enabling two-factor authentication when available</li>
                </ul>
              </section>

              {/* Acceptable Use */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Ban className="w-6 h-6 text-teal-600" />
                  4. Acceptable Use
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Send spam, unsolicited, or bulk messages without proper consent</li>
                  <li>Send messages that are illegal, harmful, threatening, abusive, or defamatory</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Use the Service for any fraudulent or illegal purpose</li>
                  <li>Send messages containing malware, viruses, or harmful code</li>
                  <li>Harvest or collect information about users without consent</li>
                  <li>Violate telecommunications regulations or carrier policies</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  For detailed acceptable use guidelines, please refer to our <a href="/legal/acceptable-use" className="text-teal-600 hover:underline">Acceptable Use Policy</a>.
                </p>
              </section>

              {/* Payment and Billing */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-teal-600" />
                  5. Payment and Billing
                </h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Pricing</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Our pricing is based on the number of SMS messages sent. Current pricing is available on our <a href="/pricing" className="text-teal-600 hover:underline">pricing page</a>. We reserve the right to modify pricing with 30 days' notice.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Payment Terms</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Payments are due according to your selected billing cycle</li>
                  <li>You must maintain a valid payment method on file</li>
                  <li>Failed payments may result in service suspension</li>
                  <li>All fees are non-refundable except as required by law</li>
                  <li>You are responsible for all applicable taxes</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.3 Credits and Top-ups</h3>
                <p className="text-gray-700 leading-relaxed">
                  Account credits are non-refundable and do not expire unless otherwise stated. Credits are applied to your account balance and used automatically for message sending.
                </p>
              </section>

              {/* Sender IDs */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Sender ID Registration</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.1 Registration Process</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Sender ID registration requires:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Submission of accurate business information</li>
                  <li>Provision of required documentation</li>
                  <li>Compliance with carrier and regulatory requirements</li>
                  <li>Approval by our team and carrier partners</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.2 Sender ID Usage</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Sender IDs are non-transferable</li>
                  <li>You may not use sender IDs for unauthorized purposes</li>
                  <li>We reserve the right to suspend or revoke sender IDs for violations</li>
                  <li>Sender IDs must comply with carrier naming policies</li>
                </ul>
              </section>

              {/* Intellectual Property */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.1 Our Rights</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Service, including its original content, features, and functionality, is owned by TXTLINK and protected by international copyright, trademark, and other intellectual property laws.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.2 Your Content</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You retain ownership of content you submit through the Service. By using the Service, you grant us a license to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Use, store, and transmit your content to provide the Service</li>
                  <li>Process and deliver your messages</li>
                  <li>Generate analytics and reports</li>
                </ul>
              </section>

              {/* Service Availability */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Service Availability and SLA</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.1 Service Level</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We strive to maintain 99.9% uptime for our Service. However, we do not guarantee:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Uninterrupted or error-free service</li>
                  <li>Immediate delivery of all messages</li>
                  <li>Compatibility with all devices or networks</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.2 Maintenance</h3>
                <p className="text-gray-700 leading-relaxed">
                  We may perform scheduled maintenance with advance notice. Emergency maintenance may occur without notice to ensure service stability.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-teal-600" />
                  9. Limitation of Liability
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND</li>
                  <li>WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
                  <li>WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES</li>
                  <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM</li>
                  <li>WE ARE NOT RESPONSIBLE FOR MESSAGE DELIVERY FAILURES DUE TO CARRIER ISSUES, NETWORK PROBLEMS, OR RECIPIENT DEVICE ISSUES</li>
                </ul>
              </section>

              {/* Indemnification */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
                <p className="text-gray-700 leading-relaxed">
                  You agree to indemnify, defend, and hold harmless TXTLINK and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service, violation of these Terms, or infringement of any rights of another.
                </p>
              </section>

              {/* Termination */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Termination</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.1 Termination by You</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You may terminate your account at any time by contacting us or using account deletion features in the dashboard.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.2 Termination by Us</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may suspend or terminate your account immediately if:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>You violate these Terms or our Acceptable Use Policy</li>
                  <li>You engage in fraudulent or illegal activity</li>
                  <li>You fail to pay fees when due</li>
                  <li>We are required to do so by law</li>
                  <li>You pose a security risk to the Service</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.3 Effect of Termination</h3>
                <p className="text-gray-700 leading-relaxed">
                  Upon termination, your right to use the Service ceases immediately. We may delete your account data after a reasonable retention period, subject to legal requirements.
                </p>
              </section>

              {/* Governing Law */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
                <p className="text-gray-700 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts of Nairobi, Kenya.
                </p>
              </section>

              {/* Changes to Terms */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We reserve the right to modify these Terms at any time. We will notify you of material changes by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Posting the updated Terms on this page</li>
                  <li>Updating the "Last updated" date</li>
                  <li>Sending email notification (for material changes)</li>
                  <li>Displaying a notice in the Service</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-teal-600" />
                  14. Contact Information
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <p className="text-gray-900 font-semibold mb-2">TXTLINK</p>
                  <p className="text-gray-700 mb-1">
                    Email: <a href="mailto:info@txtlink.co.ke" className="text-teal-600 hover:underline">info@txtlink.co.ke</a>
                  </p>
                  <p className="text-gray-700">
                    Address: Nairobi, Kenya
                  </p>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  )
}


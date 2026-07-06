'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { Shield, Lock, Eye, FileText, Mail, Calendar } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 2026'

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-6">
              <Shield className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
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
                  1. Introduction
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  TXTLINK ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our SMS messaging platform and services (the "Service").
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-teal-600" />
                  2. Information We Collect
                </h2>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>Account Information:</strong> Name, email address, phone number, company name, and billing information</li>
                  <li><strong>Sender ID Information:</strong> Sender ID names and associated documentation for registration</li>
                  <li><strong>Message Content:</strong> SMS messages you send through our platform</li>
                  <li><strong>Payment Information:</strong> Credit card details, M-Pesa information, and billing addresses (processed securely through third-party payment processors)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Information We Collect Automatically</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>Usage Data:</strong> Information about how you access and use our Service, including IP address, browser type, device information, and timestamps</li>
                  <li><strong>Message Metadata:</strong> Delivery status, timestamps, recipient phone numbers (hashed), and message routing information</li>
                  <li><strong>Log Data:</strong> Server logs, error logs, and system performance data</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.3 Information from Third Parties</h3>
                <p className="text-gray-700 leading-relaxed">
                  We may receive information about you from third-party services, such as payment processors, SMS gateway providers, and analytics services.
                </p>
              </section>

              {/* How We Use Information */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-teal-600" />
                  3. How We Use Your Information
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use the information we collect for the following purposes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>To provide, maintain, and improve our Service</li>
                  <li>To process transactions and send you related information</li>
                  <li>To send SMS messages on your behalf</li>
                  <li>To manage and process sender ID registrations</li>
                  <li>To communicate with you about your account, transactions, and our services</li>
                  <li>To monitor and analyze usage patterns and trends</li>
                  <li>To detect, prevent, and address technical issues and security threats</li>
                  <li>To comply with legal obligations and enforce our Terms of Service</li>
                  <li>To send you marketing communications (with your consent, where required)</li>
                </ul>
              </section>

              {/* Data Sharing */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information only in the following circumstances:
                </p>
                
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Service Providers</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We share information with third-party service providers who perform services on our behalf, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>SMS gateway providers for message delivery</li>
                  <li>Payment processors for transaction processing</li>
                  <li>Cloud hosting providers for infrastructure</li>
                  <li>Analytics and monitoring services</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  These service providers are contractually obligated to protect your information and use it only for the purposes we specify.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Legal Requirements</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may disclose your information if required by law, regulation, legal process, or governmental request, or to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Comply with legal obligations</li>
                  <li>Protect our rights, privacy, safety, or property</li>
                  <li>Prevent or investigate fraud or security issues</li>
                  <li>Enforce our Terms of Service</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Business Transfers</h3>
                <p className="text-gray-700 leading-relaxed">
                  In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
                </p>
              </section>

              {/* Data Security */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We implement industry-standard security measures to protect your information:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Encryption of data in transit using TLS/SSL</li>
                  <li>Encryption of sensitive data at rest</li>
                  <li>Secure authentication and access controls</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Employee training on data protection</li>
                  <li>Compliance with industry standards (ISO 27001, GDPR, where applicable)</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              {/* Data Retention */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We retain your information for as long as necessary to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Provide our Service to you</li>
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes and enforce agreements</li>
                  <li>Maintain business records for legitimate purposes</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  Message content is typically retained for 90 days for delivery status purposes, after which it is permanently deleted. Account information is retained for the duration of your account plus applicable legal retention periods.
                </p>
              </section>

              {/* Your Rights */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights and Choices</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Depending on your location, you may have the following rights regarding your personal information:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Objection:</strong> Object to processing of your information</li>
                  <li><strong>Restriction:</strong> Request restriction of processing</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  To exercise these rights, please contact us at <a href="mailto:info@txtlink.co.ke" className="text-teal-600 hover:underline">info@txtlink.co.ke</a>.
                </p>
              </section>

              {/* Cookies */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use cookies and similar tracking technologies to track activity on our Service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We use cookies for authentication, session management, analytics, and to improve user experience. You may disable cookies through your browser settings, but this may affect the functionality of our Service.
                </p>
              </section>

              {/* Children's Privacy */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed">
                  Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                </p>
              </section>

              {/* International Transfers */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. International Data Transfers</h2>
                <p className="text-gray-700 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We take appropriate safeguards to ensure your information receives adequate protection.
                </p>
              </section>

              {/* Changes */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Posting the new Privacy Policy on this page</li>
                  <li>Updating the "Last updated" date</li>
                  <li>Sending you an email notification (for material changes)</li>
                  <li>Displaying a notice on our Service</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  You are advised to review this Privacy Policy periodically for any changes. Changes are effective when posted on this page.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-6 h-6 text-teal-600" />
                  12. Contact Us
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
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


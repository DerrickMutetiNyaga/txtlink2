'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { Shield, AlertTriangle, CheckCircle2, XCircle, FileText, Mail } from 'lucide-react'

export default function AcceptableUsePage() {
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
              Acceptable Use Policy
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
                  This Acceptable Use Policy ("AUP") outlines the acceptable and prohibited uses of TXTLINK's SMS messaging platform and services (the "Service"). This policy is part of our <a href="/legal/terms" className="text-teal-600 hover:underline">Terms of Service</a>.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By using our Service, you agree to comply with this AUP. Violations may result in immediate suspension or termination of your account without refund.
                </p>
              </section>

              {/* Prohibited Content */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-600" />
                  2. Prohibited Content
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You may not use the Service to send messages containing:
                </p>
                
                <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 rounded-r-lg">
                  <ul className="list-disc list-inside space-y-3 text-gray-700">
                    <li><strong>Illegal Content:</strong> Content that violates any applicable laws, regulations, or court orders</li>
                    <li><strong>Fraudulent Content:</strong> Scams, phishing attempts, or deceptive practices</li>
                    <li><strong>Harmful Content:</strong> Malware, viruses, or code designed to damage devices or systems</li>
                    <li><strong>Harassing Content:</strong> Threats, intimidation, stalking, or harassment</li>
                    <li><strong>Defamatory Content:</strong> False statements that harm reputation</li>
                    <li><strong>Adult Content:</strong> Pornographic, sexually explicit, or adult-oriented content (unless with proper opt-in and age verification)</li>
                    <li><strong>Hate Speech:</strong> Content that promotes violence, discrimination, or hatred based on race, religion, gender, or other protected characteristics</li>
                    <li><strong>Violence:</strong> Content that incites or promotes violence</li>
                    <li><strong>Regulated Industries:</strong> Content related to gambling, alcohol, tobacco, or pharmaceuticals without proper compliance</li>
                  </ul>
                </div>
              </section>

              {/* Spam and Unsolicited Messages */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  3. Spam and Unsolicited Messages
                </h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Consent Requirements</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You must obtain explicit, verifiable consent before sending SMS messages. Consent must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Be clear and specific about what messages will be sent</li>
                  <li>Be obtained through opt-in mechanisms (not pre-checked boxes)</li>
                  <li>Allow recipients to easily opt-out</li>
                  <li>Be documented and verifiable</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Prohibited Practices</h3>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-4 rounded-r-lg">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Sending messages to purchased or rented contact lists</li>
                    <li>Using harvested phone numbers</li>
                    <li>Sending messages without prior consent</li>
                    <li>Failing to honor opt-out requests</li>
                    <li>Sending messages to numbers on Do Not Call registries (where applicable)</li>
                    <li>Using misleading sender IDs or message content</li>
                    <li>Sending excessive messages that may be considered harassment</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Opt-Out Requirements</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  All messages must include clear opt-out instructions, such as:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>"Reply STOP to unsubscribe"</li>
                  <li>"Text STOP to opt out"</li>
                  <li>Clear instructions on how to opt-out</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  You must honor all opt-out requests immediately and permanently.
                </p>
              </section>

              {/* Compliance Requirements */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  4. Compliance Requirements
                </h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Telecommunications Regulations</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You must comply with all applicable telecommunications regulations, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Kenya Communications Act and regulations</li>
                  <li>Carrier-specific policies and requirements</li>
                  <li>International regulations when sending cross-border messages</li>
                  <li>Data protection laws (GDPR, local privacy laws)</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Industry-Specific Requirements</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Certain industries have additional requirements:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Healthcare:</strong> HIPAA compliance for protected health information</li>
                  <li><strong>Financial Services:</strong> PCI-DSS compliance and financial regulations</li>
                  <li><strong>Government:</strong> Security clearances and compliance requirements</li>
                  <li><strong>Education:</strong> FERPA compliance for student information</li>
                </ul>
              </section>

              {/* Sender ID Usage */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Sender ID Usage</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Authorized Use</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Sender IDs must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Be registered and approved before use</li>
                  <li>Accurately represent your business or organization</li>
                  <li>Comply with carrier naming policies</li>
                  <li>Not be used to impersonate other entities</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Prohibited Sender ID Practices</h3>
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Using unregistered or unauthorized sender IDs</li>
                    <li>Impersonating government agencies, banks, or other organizations</li>
                    <li>Using misleading or deceptive sender IDs</li>
                    <li>Sharing sender IDs with unauthorized parties</li>
                    <li>Using sender IDs for purposes not disclosed during registration</li>
                  </ul>
                </div>
              </section>

              {/* Rate Limiting and Volume */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Rate Limiting and Volume</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.1 Reasonable Use</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You must use the Service in a reasonable manner:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Respect rate limits and throttling mechanisms</li>
                  <li>Avoid sending excessive messages that may overload systems</li>
                  <li>Distribute message sending over reasonable time periods</li>
                  <li>Not attempt to circumvent rate limits or restrictions</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.2 Bulk Messaging</h3>
                <p className="text-gray-700 leading-relaxed">
                  For bulk messaging campaigns, you should:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Use appropriate bulk messaging features</li>
                  <li>Schedule messages to avoid peak hours when possible</li>
                  <li>Monitor delivery rates and adjust accordingly</li>
                  <li>Ensure all recipients have opted in</li>
                </ul>
              </section>

              {/* Security and Access */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Security and Access</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.1 Account Security</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Maintain strong, unique passwords</li>
                  <li>Enable two-factor authentication when available</li>
                  <li>Keep API keys secure and never share them publicly</li>
                  <li>Rotate credentials regularly</li>
                  <li>Immediately report suspected security breaches</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.2 Prohibited Activities</h3>
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Attempting to gain unauthorized access to our systems</li>
                    <li>Reverse engineering or attempting to extract source code</li>
                    <li>Interfering with or disrupting the Service</li>
                    <li>Using automated tools to scrape or harvest data</li>
                    <li>Launching denial-of-service attacks</li>
                    <li>Exploiting security vulnerabilities</li>
                  </ul>
                </div>
              </section>

              {/* Data Protection */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Protection</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.1 Personal Data</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  When handling personal data through our Service, you must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Comply with applicable data protection laws (GDPR, local privacy laws)</li>
                  <li>Obtain necessary consents for data processing</li>
                  <li>Implement appropriate security measures</li>
                  <li>Respect data subject rights (access, deletion, etc.)</li>
                  <li>Not sell or share personal data without consent</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8.2 Data Retention</h3>
                <p className="text-gray-700 leading-relaxed">
                  You should only retain personal data for as long as necessary for the stated purpose and in compliance with applicable laws.
                </p>
              </section>

              {/* Violations and Enforcement */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Violations and Enforcement</h2>
                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9.1 Reporting Violations</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you become aware of any violation of this AUP, please report it immediately to <a href="mailto:info@txtlink.co.ke" className="text-teal-600 hover:underline">info@txtlink.co.ke</a>.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9.2 Enforcement Actions</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Violations of this AUP may result in:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Immediate suspension of your account</li>
                  <li>Termination of your account without refund</li>
                  <li>Blocking of specific sender IDs or phone numbers</li>
                  <li>Legal action if violations are illegal</li>
                  <li>Reporting to law enforcement or regulatory authorities</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9.3 Appeal Process</h3>
                <p className="text-gray-700 leading-relaxed">
                  If you believe your account was suspended in error, you may appeal by contacting us at <a href="mailto:info@txtlink.co.ke" className="text-teal-600 hover:underline">info@txtlink.co.ke</a> with detailed information about your case.
                </p>
              </section>

              {/* Best Practices */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Best Practices</h2>
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                  <p className="text-gray-700 leading-relaxed mb-4 font-semibold">
                    We recommend following these best practices:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Always obtain explicit consent before sending messages</li>
                    <li>Provide clear value in your messages</li>
                    <li>Include clear sender identification</li>
                    <li>Make opt-out easy and immediate</li>
                    <li>Respect recipient preferences and time zones</li>
                    <li>Monitor delivery rates and engagement</li>
                    <li>Keep your contact lists clean and up-to-date</li>
                    <li>Test messages before large campaigns</li>
                    <li>Comply with all applicable regulations</li>
                    <li>Maintain documentation of consents and opt-ins</li>
                  </ul>
                </div>
              </section>

              {/* Changes to Policy */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may update this AUP from time to time. We will notify you of material changes by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Posting the updated AUP on this page</li>
                  <li>Updating the "Last updated" date</li>
                  <li>Sending email notification (for material changes)</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  Your continued use of the Service after changes become effective constitutes acceptance of the modified AUP.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-6 h-6 text-teal-600" />
                  12. Contact Us
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you have questions about this Acceptable Use Policy, please contact us:
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


'use client'

import { MarketingLayout } from '@/components/marketing-layout'
import { Card } from '@/components/ui/card'
import { Cookie, Shield, Settings, BarChart3, Mail } from 'lucide-react'

export default function CookiePolicyPage() {
  const lastUpdated = 'January 2026'

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-6">
              <Cookie className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Cookie Policy
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
                  <Cookie className="w-6 h-6 text-teal-600" />
                  1. Introduction
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  TXTLINK ("we," "our," or "us") uses cookies and similar technologies on our website and services (the "Service"). This Cookie Policy explains what cookies are, how we use them, and your choices regarding them.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By using our Service, you consent to our use of cookies as described in this policy. You can change your cookie preferences at any time through your browser settings or the options we provide.
                </p>
              </section>

              {/* What Are Cookies */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. What Are Cookies?</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Cookies are small text files that are placed on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently, to provide information to the owners of the site, and to improve your experience.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Cookies can be "first-party" (set by us) or "third-party" (set by a different domain). They can also be "session" cookies (deleted when you close your browser) or "persistent" cookies (remain until they expire or you delete them).
                </p>
              </section>

              {/* How We Use Cookies */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-teal-600" />
                  3. How We Use Cookies
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use cookies for the following purposes:
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Strictly Necessary Cookies</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  These cookies are essential for the Service to function. They enable core features such as security, authentication, and load balancing. You cannot opt out of these cookies without affecting how the Service works.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Session and authentication tokens</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing and performance</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Functional Cookies</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Language and region preferences</li>
                  <li>Dashboard layout and display options</li>
                  <li>Form auto-fill and preferences</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Analytics and Performance Cookies</h3>
                <p className="text-gray-700 leading-relaxed mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  These cookies help us understand how visitors interact with our Service by collecting and reporting information anonymously.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Page views and navigation paths</li>
                  <li>Time spent on pages</li>
                  <li>Error rates and performance metrics</li>
                </ul>
              </section>

              {/* Cookie Types Table */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Types of Cookies We Use</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Purpose</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4">Authentication</td>
                        <td className="py-3 px-4">Strictly necessary</td>
                        <td className="py-3 px-4">Session</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4">Security (CSRF, etc.)</td>
                        <td className="py-3 px-4">Strictly necessary</td>
                        <td className="py-3 px-4">Session</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4">Preferences</td>
                        <td className="py-3 px-4">Functional</td>
                        <td className="py-3 px-4">Up to 1 year</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4">Analytics</td>
                        <td className="py-3 px-4">Analytics</td>
                        <td className="py-3 px-4">Up to 2 years</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Third-Party Cookies */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Cookies</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may allow trusted third parties to place cookies on your device for analytics, support, or other services. These parties have their own privacy and cookie policies. We recommend reviewing their policies for more information.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We do not allow third-party advertising cookies on our Service.
                </p>
              </section>

              {/* Your Choices */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Choices</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You can control and manage cookies in several ways:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li><strong>Browser settings:</strong> Most browsers allow you to refuse or accept cookies, or to delete existing cookies. Check your browser's "Help" or "Settings" for how to do this.</li>
                  <li><strong>Opt-out links:</strong> For analytics cookies, we may provide opt-out mechanisms where applicable.</li>
                  <li><strong>Strictly necessary cookies:</strong> These cannot be disabled if you wish to use the Service, as they are required for core functionality.</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Please note that blocking or deleting cookies may affect the functionality of our Service and your user experience.
                </p>
              </section>

              {/* Updates */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Changes to This Cookie Policy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of any material changes by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Posting the updated policy on this page</li>
                  <li>Updating the "Last updated" date</li>
                  <li>Where appropriate, displaying a notice on our Service</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  We encourage you to review this Cookie Policy periodically.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-6 h-6 text-teal-600" />
                  8. Contact Us
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you have questions about our use of cookies or this Cookie Policy, please contact us:
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
                <p className="text-gray-700 leading-relaxed mt-4">
                  For more information about how we handle your personal data, please see our <a href="/legal/privacy" className="text-teal-600 hover:underline">Privacy Policy</a>.
                </p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  )
}

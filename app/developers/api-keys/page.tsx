'use client'

import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'
import { Callout } from '@/components/docs/callout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function APIKeysPage() {
  const generateExample = `# Generate API Key from Dashboard
1. Log in to your TXTLINK account
2. Navigate to Settings → API Keys
3. Click "Create API Key"
4. Copy the key immediately (you won't see it again!)`

  const envExample = `# .env file
TXTLINK_API_KEY=sk_live_abc123xyz...`

  const usageExample = `# Using API Key in requests
curl -X POST https://www.txtlink.co.ke/api/v1/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+254712345678",
    "message": "Hello from TXTLINK!",
    "senderIdName": "TXTLINK"
  }'`

  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            API Keys
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            API keys are the recommended way to authenticate with the TXTLINK API. 
            They provide secure, scoped access to your account without exposing your password.
          </p>
        </div>

        {/* Getting Started */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Getting Your API Key</h2>
          <p className="text-slate-600 mb-6">
            To generate an API key, you need to:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-slate-600 mb-6">
            <li>Have at least one approved sender ID in your account</li>
            <li>Log in to your TXTLINK dashboard</li>
            <li>Navigate to <strong>Settings → API Keys</strong></li>
            <li>Click <strong>"Create API Key"</strong></li>
            <li>Copy the key immediately—you won't be able to see it again!</li>
          </ol>
          <div className="flex gap-4">
            <Link href="/app/api-keys">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-5 py-2.5">
                Go to API Keys
                <Key className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="border-slate-300 text-slate-700">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* API Key Types */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">API Key Types</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border border-blue-200 bg-blue-50 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Test Keys</h3>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Use test keys for development and testing. Messages sent with test keys 
                are not delivered to real phone numbers.
              </p>
              <div className="text-xs font-mono text-slate-500 bg-white px-3 py-2 rounded">
                sk_test_...
              </div>
            </Card>
            <Card className="p-6 border border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Key className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Live Keys</h3>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Use live keys for production. Messages sent with live keys are 
                delivered to real phone numbers and charged to your account.
              </p>
              <div className="text-xs font-mono text-slate-500 bg-white px-3 py-2 rounded">
                sk_live_...
              </div>
            </Card>
          </div>
        </div>

        {/* Using API Keys */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Using API Keys</h2>
          <p className="text-slate-600 mb-6">
            Include your API key in the <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">Authorization</code> header 
            of every API request as a Bearer token:
          </p>
          <CodeBlock code={usageExample} language="bash" />
        </div>

        {/* Environment Variables */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Environment Variables</h2>
          <p className="text-slate-600 mb-6">
            Store your API key in an environment variable. Never hardcode it in your source code.
          </p>
          <CodeBlock code={envExample} language="bash" filename=".env" />
          <Callout type="warning" title="Security Best Practices">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Never commit API keys to version control</li>
              <li>Use different keys for test and production environments</li>
              <li>Rotate keys regularly (at least every 90 days)</li>
              <li>Revoke keys immediately if compromised</li>
              <li>Use IP whitelisting for additional security (Enterprise plans)</li>
            </ul>
          </Callout>
        </div>

        {/* Key Management */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Management</h2>
          <div className="space-y-4">
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">Creating Keys</h3>
              <p className="text-slate-600 mb-4">
                You can create multiple API keys for different applications or environments. 
                Each key is independent and can be revoked separately.
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Name your keys descriptively (e.g., "Production App", "Staging Server")</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Use test keys during development</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Switch to live keys only when ready for production</span>
                </li>
              </ul>
            </Card>
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3">Revoking Keys</h3>
              <p className="text-slate-600 mb-4">
                If a key is compromised or no longer needed, revoke it immediately from 
                the dashboard. Revoked keys cannot be used for new requests.
              </p>
              <Callout type="warning" title="Important">
                Revoking a key will immediately stop all requests using that key. Make sure 
                to update your applications before revoking production keys.
              </Callout>
            </Card>
          </div>
        </div>

        {/* Alternative: Username/Password */}
        <div className="mb-12">
          <Card className="p-6 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-3">Alternative: Username/Password</h3>
            <p className="text-slate-600 mb-4">
              If you prefer not to use API keys, you can authenticate using your account 
              email and password with Basic Auth or in the request body.
            </p>
            <Link href="/developers/authentication">
              <Button variant="outline" className="border-slate-300 text-slate-700">
                Learn about Username/Password Auth
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </DocsLayout>
  )
}


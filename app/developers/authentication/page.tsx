'use client'

import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'
import { Callout } from '@/components/docs/callout'
import { Card } from '@/components/ui/card'
import { Tabs, Tab } from '@/components/docs/tabs'

export default function AuthenticationPage() {
  const apiKeyExample = `curl https://www.txtlink.co.ke/api/v1/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+254712345678",
    "message": "Hello from TXTLINK",
    "senderIdName": "TXTLINK"
  }'`

  const basicAuthExample = `curl https://www.txtlink.co.ke/api/v1/sms/send \\
  -u "your-email@example.com:your-password" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+254712345678",
    "message": "Hello from TXTLINK",
    "senderIdName": "TXTLINK"
  }'`

  const bodyAuthExample = `curl https://www.txtlink.co.ke/api/v1/sms/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "your-email@example.com",
    "password": "your-password",
    "to": "+254712345678",
    "message": "Hello from TXTLINK",
    "senderIdName": "TXTLINK"
  }'`

  const envExample = `# .env file
TXTLINK_API_KEY=sk_live_abc123xyz...`

  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Authentication
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            TXTLINK API supports two authentication methods: API keys (recommended) 
            and username/password. Choose the method that works best for your application.
          </p>
        </div>

        {/* Authentication Methods */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Authentication Methods</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900">API Key (Recommended)</h3>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Use API keys for production applications. More secure and easier to manage.
              </p>
              <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded">
                Bearer sk_live_...
              </div>
            </Card>
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
              <h3 className="font-semibold text-slate-900 mb-2">Username/Password</h3>
              <p className="text-sm text-slate-600 mb-4">
                Use your account credentials. Great for testing and simple integrations.
              </p>
              <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded">
                Basic Auth or body
              </div>
            </Card>
          </div>
        </div>

        {/* API Key Types */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">API Key Types</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border border-blue-200 bg-blue-50 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Test Keys</h3>
              <p className="text-sm text-slate-600 mb-3">
                Use test keys for development. Messages sent with test keys are 
                not delivered to real phone numbers.
              </p>
              <div className="text-xs font-mono text-slate-500 bg-white px-3 py-2 rounded">
                sk_test_...
              </div>
            </Card>
            <Card className="p-6 border border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Live Keys</h3>
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
          <CodeBlock code={apiKeyExample} language="bash" />
          <Callout type="info" title="Getting Your API Key">
            Generate API keys from Settings → API Keys in your dashboard. You'll need at least one approved sender ID first.
          </Callout>
        </div>

        {/* Using Username/Password */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Using Username/Password</h2>
          <p className="text-slate-600 mb-6">
            You can authenticate using your account email and password in two ways:
          </p>
          
          <Tabs defaultTab="basic">
            <Tab id="basic" label="Basic Auth (Recommended)">
              <p className="text-slate-600 mb-4">
                Use HTTP Basic Authentication. This is the standard and most secure method:
              </p>
              <CodeBlock code={basicAuthExample} language="bash" />
            </Tab>
            <Tab id="body" label="Request Body">
              <p className="text-slate-600 mb-4">
                Include credentials in the request body (useful for some HTTP clients):
              </p>
              <CodeBlock code={bodyAuthExample} language="bash" />
            </Tab>
          </Tabs>
          
          <Callout type="warning" title="Security Note">
            While username/password authentication is convenient, API keys are more secure for production use. 
            Consider rotating passwords regularly and never commit credentials to version control.
          </Callout>
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
              <li>Rotate keys regularly</li>
              <li>Use IP whitelisting for additional security</li>
            </ul>
          </Callout>
        </div>

        {/* Key Rotation */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Rotation</h2>
          <p className="text-slate-600 mb-6">
            Regularly rotate your API keys to maintain security. You can create new keys 
            and revoke old ones from the dashboard without service interruption.
          </p>
          <ol className="list-decimal list-inside space-y-3 text-slate-600">
            <li>Generate a new API key in Settings → API Keys</li>
            <li>Update your environment variables with the new key</li>
            <li>Test that your application works with the new key</li>
            <li>Revoke the old key once you've confirmed everything works</li>
          </ol>
        </div>

        {/* IP Whitelisting */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">IP Whitelisting</h2>
          <p className="text-slate-600 mb-6">
            For additional security, you can restrict API key usage to specific IP addresses. 
            This prevents unauthorized access even if your key is compromised.
          </p>
          <Callout type="info" title="IP Whitelisting">
            IP whitelisting is available for Enterprise plans. Contact support to enable this feature.
          </Callout>
        </div>
      </div>
    </DocsLayout>
  )
}


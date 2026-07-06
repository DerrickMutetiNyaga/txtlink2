'use client'

import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'
import { Tabs, Tab } from '@/components/docs/tabs'
import { Callout } from '@/components/docs/callout'
import { StepTimeline } from '@/components/docs/step-timeline'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function QuickStartPage() {
  const steps = [
    {
      title: 'Create account',
      description: 'Sign up for a free TXTLINK account. No credit card required.',
      time: '2 min',
    },
    {
      title: 'Generate API key',
      description: 'Navigate to Settings → API Keys and create a new API key.',
      time: '1 min',
    },
    {
      title: 'Install SDK',
      description: 'Install the TXTLINK SDK for your preferred language.',
      time: '1 min',
    },
    {
      title: 'Send first SMS',
      description: 'Use the SDK to send your first SMS message.',
      time: '1 min',
    },
    {
      title: 'Receive delivery report',
      description: 'Set up webhooks to receive delivery status updates (optional).',
      time: 'optional',
    },
  ]

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://api.txtlink.com'

  const nodeExampleApiKey = `// Using API Key (Recommended)
const response = await fetch('${baseUrl}/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.TXTLINK_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+254712345678',
    message: 'Hello from TXTLINK!',
    senderIdName: 'TXTLINK'
  })
})

const result = await response.json()
console.log('Message ID:', result.messageId)
console.log('Status:', result.status)`

  const nodeExamplePassword = `// Using Username/Password
const credentials = btoa(\`\${process.env.TXTLINK_EMAIL}:\${process.env.TXTLINK_PASSWORD}\`)
const response = await fetch('${baseUrl}/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Authorization': \`Basic \${credentials}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+254712345678',
    message: 'Hello from TXTLINK!',
    senderIdName: 'TXTLINK'
  })
})

const result = await response.json()
console.log('Message ID:', result.messageId)`

  const pythonExampleApiKey = `# Using API Key (Recommended)
import requests
import os

response = requests.post(
    '${baseUrl}/api/v1/sms/send',
    headers={
        'Authorization': f"Bearer {os.getenv('TXTLINK_API_KEY')}",
        'Content-Type': 'application/json',
    },
    json={
        'to': '+254712345678',
        'message': 'Hello from TXTLINK!',
        'senderIdName': 'TXTLINK'
    }
)

result = response.json()
print(f"Message ID: {result['messageId']}")
print(f"Status: {result['status']}")`

  const pythonExamplePassword = `# Using Username/Password
import requests
from requests.auth import HTTPBasicAuth
import os

response = requests.post(
    '${baseUrl}/api/v1/sms/send',
    auth=HTTPBasicAuth(os.getenv('TXTLINK_EMAIL'), os.getenv('TXTLINK_PASSWORD')),
    headers={'Content-Type': 'application/json'},
    json={
        'to': '+254712345678',
        'message': 'Hello from TXTLINK!',
        'senderIdName': 'TXTLINK'
    }
)

result = response.json()
print(f"Message ID: {result['messageId']}")`

  const phpExampleApiKey = `<?php
// Using API Key (Recommended)
$ch = curl_init('${baseUrl}/api/v1/sms/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . getenv('TXTLINK_API_KEY'),
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => '+254712345678',
    'message' => 'Hello from TXTLINK!',
    'senderIdName' => 'TXTLINK'
]));

$response = curl_exec($ch);
$result = json_decode($response, true);
echo "Message ID: " . $result['messageId'] . "\\n";
curl_close($ch);
?>`

  const phpExamplePassword = `<?php
// Using Username/Password
$ch = curl_init('${baseUrl}/api/v1/sms/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_USERPWD, getenv('TXTLINK_EMAIL') . ':' . getenv('TXTLINK_PASSWORD'));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => '+254712345678',
    'message' => 'Hello from TXTLINK!',
    'senderIdName' => 'TXTLINK'
]));

$response = curl_exec($ch);
$result = json_decode($response, true);
echo "Message ID: " . $result['messageId'] . "\\n";
curl_close($ch);
?>`

  const responseExample = `{
  "success": true,
  "messageId": "507f1f77bcf86cd799439011",
  "segments": 1,
  "totalCredits": 1,
  "totalCostKes": 2.0,
  "newBalance": 99,
  "status": "queued",
  "to": "+254712345678",
  "senderId": "TXTLINK"
}`

  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Quick Start
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Get up and running with TXTLINK in 5 minutes. Follow these steps 
            to send your first SMS.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="mb-12">
          <StepTimeline steps={steps} />
        </div>

        {/* Step 1: Create Account */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">1</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Create account</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Sign up for a free TXTLINK account. You'll get access to test API keys 
            and can send up to 100 SMS messages for free during development.
          </p>
          <div className="flex gap-4">
            <Link href="/auth/register">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                Create Account
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="border-slate-300 text-slate-700">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 2: Choose Authentication Method */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">2</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Choose Authentication Method</h2>
          </div>
          <p className="text-slate-600 mb-6">
            TXTLINK supports two authentication methods. Choose the one that works best for you:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900">Option A: API Key (Recommended)</h3>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Navigate to <strong>Settings → API Keys</strong> and create a new API key. 
                Copy it immediately—you won't be able to see it again.
              </p>
              <Callout type="info" title="Best for production">
                More secure and easier to manage. Use for production applications.
              </Callout>
            </Card>
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
              <h3 className="font-semibold text-slate-900 mb-2">Option B: Username/Password</h3>
              <p className="text-sm text-slate-600 mb-4">
                Use your account email and password. No setup required—just use your login credentials.
              </p>
              <Callout type="info" title="Great for testing">
                Quick and easy. Perfect for testing and simple integrations.
              </Callout>
            </Card>
          </div>
          
          <Callout type="warning" title="Keep credentials secure">
            Never expose API keys or passwords in frontend code or commit them to version control. 
            Always use environment variables.
          </Callout>
        </div>

        {/* Step 3: Install SDK */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">3</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Install SDK</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Install the TXTLINK SDK for your preferred programming language:
          </p>
          <Tabs defaultTab="node">
            <Tab id="node" label="Node.js">
              <CodeBlock
                code="npm install @txtlink/sdk"
                language="bash"
              />
            </Tab>
            <Tab id="python" label="Python">
              <CodeBlock
                code="pip install txtlink-sdk"
                language="bash"
              />
            </Tab>
            <Tab id="php" label="PHP">
              <CodeBlock
                code="composer require txtlink/sdk"
                language="bash"
              />
            </Tab>
          </Tabs>
        </div>

        {/* Step 4: Send First SMS */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">4</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Send first SMS</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Send your first SMS using the REST API. Replace the phone number with your own 
            to receive a test message. Examples below show both authentication methods.
          </p>

          <Tabs defaultTab="node">
            <Tab id="node" label="Node.js">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={nodeExampleApiKey} language="javascript" />
                </Tab>
                <Tab id="password" label="Username/Password">
                  <CodeBlock code={nodeExamplePassword} language="javascript" />
                </Tab>
              </Tabs>
            </Tab>
            <Tab id="python" label="Python">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={pythonExampleApiKey} language="python" />
                </Tab>
                <Tab id="password" label="Username/Password">
                  <CodeBlock code={pythonExamplePassword} language="python" />
                </Tab>
              </Tabs>
            </Tab>
            <Tab id="php" label="PHP">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={phpExampleApiKey} language="php" />
                </Tab>
                <Tab id="password" label="Username/Password">
                  <CodeBlock code={phpExamplePassword} language="php" />
                </Tab>
              </Tabs>
            </Tab>
          </Tabs>

          <div className="mt-6">
            <Callout type="success" title="You'll receive an SMS instantly">
              After running this code, you should receive an SMS on the phone number 
              you specified within seconds. Make sure you have an approved sender ID!
            </Callout>
          </div>
        </div>

        {/* Expected Response */}
        <div className="mb-16">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Expected Response</h3>
          <CodeBlock code={responseExample} language="json" />
        </div>

        {/* Next Steps */}
        <Card className="p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Next Steps</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <Link href="/developers/api/rest" className="font-medium text-emerald-700 hover:text-emerald-800">
                  Explore the REST API
                </Link>
                <p className="text-sm text-slate-600">Complete API reference with examples for all languages</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <Link href="/developers/guides/webhooks" className="font-medium text-emerald-700 hover:text-emerald-800">
                  Set up webhooks
                </Link>
                <p className="text-sm text-slate-600">Receive real-time delivery status updates</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <Link href="/developers/api/rest" className="font-medium text-emerald-700 hover:text-emerald-800">
                  Read the API reference
                </Link>
                <p className="text-sm text-slate-600">Complete documentation for all API endpoints</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </DocsLayout>
  )
}


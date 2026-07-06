'use client'

import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'
import { Tabs, Tab } from '@/components/docs/tabs'
import { Callout } from '@/components/docs/callout'
import { Card } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function NodeJSSDKPage() {
  const installExample = `npm install @txtlink/sdk`

  const quickExample = `import { TXTLINK } from '@txtlink/sdk';

const client = new TXTLINK({
  apiKey: process.env.TXTLINK_API_KEY,
});

// Send SMS
const result = await client.sms.send({
  to: '+254712345678',
  message: 'Hello from TXTLINK!',
  senderId: 'TXTLINK',
});

console.log(result);`

  const advancedExample = `import { TXTLINK } from '@txtlink/sdk';

const client = new TXTLINK({
  apiKey: process.env.TXTLINK_API_KEY,
  timeout: 30000, // 30 seconds
});

// Send bulk SMS
const results = await client.sms.sendBulk({
  messages: [
    { to: '+254712345678', message: 'Hello 1' },
    { to: '+254712345679', message: 'Hello 2' },
  ],
  senderId: 'TXTLINK',
});

// Handle webhooks
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-txtlink-signature'];
  const isValid = client.webhooks.verify(req.body, signature);
  
  if (isValid) {
    const event = req.body;
    // Handle event
  }
  
  res.status(200).send('OK');
});`

  const errorHandlingExample = `import { TXTLINK, TXTLINKError } from '@txtlink/sdk';

try {
  const result = await client.sms.send({
    to: '+254712345678',
    message: 'Hello',
    senderId: 'TXTLINK',
  });
} catch (error) {
  if (error instanceof TXTLINKError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Error Code:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}`

  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-slate-900">
              Node.js SDK
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">v1.2.0</span>
              <Link
                href="https://github.com/txtlink/node-sdk"
                target="_blank"
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
              >
                GitHub
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <p className="text-xl text-slate-600 leading-relaxed">
            Official Node.js SDK for TXTLINK. TypeScript support included.
          </p>
        </div>

        {/* Install */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Installation</h2>
          <CodeBlock code={installExample} language="bash" />
        </div>

        {/* Quick Example */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Example</h2>
          <CodeBlock code={quickExample} language="javascript" />
        </div>

        {/* Advanced Usage */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Advanced Usage</h2>
          <CodeBlock code={advancedExample} language="javascript" />
        </div>

        {/* Error Handling */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Error Handling</h2>
          <CodeBlock code={errorHandlingExample} language="javascript" />
        </div>

        {/* TypeScript Support */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">TypeScript Support</h2>
          <p className="text-slate-600 mb-6">
            The SDK includes full TypeScript definitions. No additional types package needed.
          </p>
          <Callout type="info" title="TypeScript">
            All types are exported from the main package. Import types directly:
            <CodeBlock
              code={`import { TXTLINK, SMSResult, WebhookEvent } from '@txtlink/sdk';`}
              language="typescript"
            />
          </Callout>
        </div>

        {/* Versioning */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Versioning</h2>
          <p className="text-slate-600 mb-6">
            The SDK follows semantic versioning. We recommend pinning to a specific version 
            in production:
          </p>
          <CodeBlock
            code={`npm install @txtlink/sdk@1.2.0`}
            language="bash"
          />
        </div>

        {/* Resources */}
        <Card className="p-6 bg-slate-50">
          <h3 className="font-semibold text-slate-900 mb-4">Resources</h3>
          <ul className="space-y-2">
            <li>
              <Link href="https://github.com/txtlink/node-sdk" className="text-emerald-600 hover:text-emerald-700 text-sm">
                GitHub Repository
              </Link>
            </li>
            <li>
              <Link href="/developers/reference/errors" className="text-emerald-600 hover:text-emerald-700 text-sm">
                Error Reference
              </Link>
            </li>
            <li>
              <Link href="/developers/api/rest" className="text-emerald-600 hover:text-emerald-700 text-sm">
                REST API Reference
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </DocsLayout>
  )
}


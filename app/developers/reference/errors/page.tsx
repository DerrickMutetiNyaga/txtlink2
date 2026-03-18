'use client'

import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'
import { Callout } from '@/components/docs/callout'
import { Card } from '@/components/ui/card'
import { AlertCircle, XCircle, Info } from 'lucide-react'

export default function ErrorsPage() {
  const errorResponseExample = `{
  "error": "Insufficient SMS credits",
  "errorCode": "INSUFFICIENT_CREDITS",
  "message": "Your account does not have enough credits to send this message"
}`

  const errorHandlingExample = `// JavaScript/Node.js
try {
  const response = await fetch('https://www.txtlink.co.ke/api/v1/sms/send', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: '+254712345678',
      message: 'Hello',
      senderIdName: 'TXTLINK'
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error:', error.error)
    console.error('Error Code:', error.errorCode)
    // Handle specific error codes
    if (error.errorCode === 'INSUFFICIENT_CREDITS') {
      // Prompt user to top up
    }
  }
} catch (error) {
  console.error('Network error:', error)
}`

  const errors = [
    {
      code: 'UNAUTHORIZED',
      status: 401,
      title: 'Unauthorized',
      description: 'Invalid API key or credentials',
      solution: 'Check that your API key is correct and active, or verify your username/password',
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      code: 'INVALID_PHONE_NUMBER',
      status: 400,
      title: 'Invalid Phone Number',
      description: 'The phone number format is incorrect',
      solution: 'Use E.164 format with country code (e.g., +254712345678)',
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      code: 'INSUFFICIENT_CREDITS',
      status: 402,
      title: 'Insufficient Credits',
      description: 'Your account does not have enough credits',
      solution: 'Top up your account from the dashboard',
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      code: 'SENDER_ID_NOT_FOUND',
      status: 403,
      title: 'Sender ID Not Found',
      description: 'The specified sender ID does not exist or is not authorized',
      solution: 'Check that the sender ID name is correct and approved for your account',
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      code: 'SENDER_ID_INACTIVE',
      status: 400,
      title: 'Sender ID Inactive',
      description: 'The sender ID is not active',
      solution: 'Wait for sender ID approval or contact support',
      icon: Info,
      color: 'text-blue-600',
    },
    {
      code: 'MESSAGE_TOO_LONG',
      status: 400,
      title: 'Message Too Long',
      description: 'The message exceeds the maximum length',
      solution: 'Split long messages into multiple parts or reduce message length',
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      title: 'Rate Limit Exceeded',
      description: 'Too many requests in a short period',
      solution: 'Wait before making more requests or upgrade your plan',
      icon: AlertCircle,
      color: 'text-amber-600',
    },
    {
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      title: 'Internal Server Error',
      description: 'An unexpected error occurred on our servers',
      solution: 'Retry the request. If the problem persists, contact support',
      icon: XCircle,
      color: 'text-red-600',
    },
  ]

  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Error Reference
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Complete reference for all error codes and status codes returned by the TXTLINK API. 
            Use this guide to handle errors gracefully in your application.
          </p>
        </div>

        {/* Error Response Format */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Error Response Format</h2>
          <p className="text-slate-600 mb-6">
            All error responses follow a consistent format:
          </p>
          <CodeBlock code={errorResponseExample} language="json" />
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Response Fields</h3>
            <ul className="space-y-2 text-slate-600">
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">error</code> - Human-readable error message</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">errorCode</code> - Machine-readable error code for programmatic handling</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">message</code> - Additional context (optional)</li>
            </ul>
          </div>
        </div>

        {/* Error Handling */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Error Handling</h2>
          <p className="text-slate-600 mb-6">
            Always check the HTTP status code and handle errors appropriately:
          </p>
          <CodeBlock code={errorHandlingExample} language="javascript" />
        </div>

        {/* Error Codes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Error Codes</h2>
          <div className="space-y-4">
            {errors.map((error) => {
              const Icon = error.icon
              // Determine border color based on status
              const borderColor = error.status === 401 || error.status === 403 || error.status === 500
                ? 'border-red-500'
                : error.status === 429
                ? 'border-amber-500'
                : error.status === 400 || error.status === 402
                ? 'border-red-500'
                : 'border-red-500'
              
              // Badge color
              const badgeColor = error.status === 429
                ? 'bg-amber-100 text-amber-700'
                : error.status === 401 || error.status === 403 || error.status === 500
                ? 'bg-red-100 text-red-700'
                : 'bg-red-100 text-red-700'
              
              return (
                <Card key={error.code} className={`p-6 bg-white border border-slate-200 border-l-4 ${borderColor} rounded-2xl shadow-sm`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${error.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{error.title}</h3>
                        <span className={`px-2 py-1 ${badgeColor} rounded text-xs font-mono`}>
                          {error.code}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {error.status}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-3">{error.description}</p>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-sm text-slate-700">
                          <strong>Solution:</strong> {error.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* HTTP Status Codes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">HTTP Status Codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-900">Status Code</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-900">Meaning</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-900">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">200</td>
                  <td className="py-2 px-3">OK</td>
                  <td className="py-2 px-3">Request succeeded</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">400</td>
                  <td className="py-2 px-3">Bad Request</td>
                  <td className="py-2 px-3">Invalid parameters or request format</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">401</td>
                  <td className="py-2 px-3">Unauthorized</td>
                  <td className="py-2 px-3">Invalid or missing authentication</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">402</td>
                  <td className="py-2 px-3">Payment Required</td>
                  <td className="py-2 px-3">Insufficient credits</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">403</td>
                  <td className="py-2 px-3">Forbidden</td>
                  <td className="py-2 px-3">Sender ID not authorized or access denied</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">429</td>
                  <td className="py-2 px-3">Too Many Requests</td>
                  <td className="py-2 px-3">Rate limit exceeded</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-3 font-mono text-xs">500</td>
                  <td className="py-2 px-3">Internal Server Error</td>
                  <td className="py-2 px-3">Unexpected server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mb-12">
          <Callout type="info" title="Error Handling Best Practices">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Always check HTTP status codes before processing responses</li>
              <li>Use error codes for programmatic error handling</li>
              <li>Display user-friendly error messages to end users</li>
              <li>Log error details for debugging</li>
              <li>Implement retry logic for transient errors (5xx)</li>
              <li>Handle rate limiting gracefully with exponential backoff</li>
            </ul>
          </Callout>
        </div>
      </div>
    </DocsLayout>
  )
}


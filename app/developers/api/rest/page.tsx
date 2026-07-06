'use client'

import { DocsLayout } from '@/components/docs-layout'
import { CodeBlock } from '@/components/docs/code-block'
import { Callout } from '@/components/docs/callout'
import { Card } from '@/components/ui/card'
import { Tabs, Tab } from '@/components/docs/tabs'

export default function RESTAPIPage() {
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://api.txtlink.com'

  // API Key Examples
  const curlApiKey = `curl -X POST ${baseUrl}/api/v1/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+254712345678",
    "message": "Hello from TXTLINK!",
    "senderIdName": "TXTLINK"
  }'`

  const curlBasicAuth = `curl -X POST ${baseUrl}/api/v1/sms/send \\
  -u "your-email@example.com:your-password" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+254712345678",
    "message": "Hello from TXTLINK!",
    "senderIdName": "TXTLINK"
  }'`

  // JavaScript/Node.js Examples
  const jsApiKey = `// Using API Key
const response = await fetch('${baseUrl}/api/v1/sms/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+254712345678',
    message: 'Hello from TXTLINK!',
    senderIdName: 'TXTLINK'
  })
})

const data = await response.json()
console.log(data)`

  const jsBasicAuth = `// Using Username/Password (Basic Auth)
const credentials = btoa('your-email@example.com:your-password')
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

const data = await response.json()
console.log(data)`

  // Python Examples
  const pythonApiKey = `# Using API Key
import requests

response = requests.post(
    '${baseUrl}/api/v1/sms/send',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'to': '+254712345678',
        'message': 'Hello from TXTLINK!',
        'senderIdName': 'TXTLINK'
    }
)

print(response.json())`

  const pythonBasicAuth = `# Using Username/Password
import requests
from requests.auth import HTTPBasicAuth

response = requests.post(
    '${baseUrl}/api/v1/sms/send',
    auth=HTTPBasicAuth('your-email@example.com', 'your-password'),
    headers={'Content-Type': 'application/json'},
    json={
        'to': '+254712345678',
        'message': 'Hello from TXTLINK!',
        'senderIdName': 'TXTLINK'
    }
)

print(response.json())`

  // PHP Examples
  const phpApiKey = `<?php
// Using API Key
$ch = curl_init('${baseUrl}/api/v1/sms/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => '+254712345678',
    'message' => 'Hello from TXTLINK!',
    'senderIdName' => 'TXTLINK'
]));

$response = curl_exec($ch);
$data = json_decode($response, true);
print_r($data);
curl_close($ch);
?>`

  const phpBasicAuth = `<?php
// Using Username/Password
$ch = curl_init('${baseUrl}/api/v1/sms/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_USERPWD, 'your-email@example.com:your-password');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => '+254712345678',
    'message' => 'Hello from TXTLINK!',
    'senderIdName' => 'TXTLINK'
]));

$response = curl_exec($ch);
$data = json_decode($response, true);
print_r($data);
curl_close($ch);
?>`

  // Java Examples
  const javaApiKey = `// Using API Key
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${baseUrl}/api/v1/sms/send"))
    .header("Authorization", "Bearer YOUR_API_KEY")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        "{\\"to\\":\\"+254712345678\\",\\"message\\":\\"Hello from TXTLINK!\\",\\"senderIdName\\":\\"TXTLINK\\"}"
    ))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`

  // Go Examples
  const goApiKey = `// Using API Key
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    data := map[string]string{
        "to":          "+254712345678",
        "message":     "Hello from TXTLINK!",
        "senderIdName": "TXTLINK",
    }
    
    jsonData, _ := json.Marshal(data)
    
    req, _ := http.NewRequest("POST", "${baseUrl}/api/v1/sms/send", bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}`

  // Ruby Examples
  const rubyApiKey = `# Using API Key
require 'net/http'
require 'json'
require 'uri'

uri = URI('${baseUrl}/api/v1/sms/send')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true if uri.scheme == 'https'

request = Net::HTTP::Post.new(uri)
request['Authorization'] = 'Bearer YOUR_API_KEY'
request['Content-Type'] = 'application/json'
request.body = {
  to: '+254712345678',
  message: 'Hello from TXTLINK!',
  senderIdName: 'TXTLINK'
}.to_json

response = http.request(request)
puts response.body`

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

  const errorExample = `{
  "error": "Insufficient SMS credits",
  "errorCode": "INSUFFICIENT_CREDITS"
}`

  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            REST API Reference
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Complete reference for the TXTLINK REST API. Send SMS messages with 
            simple HTTP requests from any programming language.
          </p>
        </div>

        {/* Base URL */}
        <div className="mb-12">
          <Card className="p-6 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-2">Base URL</h3>
            <code className="text-sm text-slate-700">{baseUrl}/api/v1</code>
          </Card>
        </div>

        {/* Send SMS Endpoint */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Send SMS</h2>
          <p className="text-slate-600 mb-4">
            Send a single SMS message to a phone number.
          </p>
          
          <Card className="p-6 mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="mb-4">
              <div className="inline-flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-2 font-mono">
                <span className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-sm font-medium">
                  POST
                </span>
                <code className="text-sm">/api/v1/sms/send</code>
              </div>
            </div>
            
            <h4 className="font-semibold text-slate-900 mt-6 mb-3">Request Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Parameter</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Required</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-900">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">to</td>
                    <td className="py-2 px-3">string</td>
                    <td className="py-2 px-3">Yes</td>
                    <td className="py-2 px-3">Recipient phone number in E.164 format (e.g., +254712345678)</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">message</td>
                    <td className="py-2 px-3">string</td>
                    <td className="py-2 px-3">Yes</td>
                    <td className="py-2 px-3">SMS message content (up to 1600 characters)</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">senderIdName</td>
                    <td className="py-2 px-3">string</td>
                    <td className="py-2 px-3">No</td>
                    <td className="py-2 px-3">Sender ID name (e.g., "TXTLINK"). Uses default if not specified</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs">senderId</td>
                    <td className="py-2 px-3">string</td>
                    <td className="py-2 px-3">No</td>
                    <td className="py-2 px-3">Sender ID MongoDB ID (alternative to senderIdName)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <h3 className="text-xl font-bold text-slate-900 mb-4">Examples</h3>
          
          <Tabs defaultTab="curl">
            <Tab id="curl" label="cURL">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={curlApiKey} language="bash" />
                </Tab>
                <Tab id="basicauth" label="Basic Auth">
                  <CodeBlock code={curlBasicAuth} language="bash" />
                </Tab>
              </Tabs>
            </Tab>
            <Tab id="javascript" label="JavaScript">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={jsApiKey} language="javascript" />
                </Tab>
                <Tab id="basicauth" label="Basic Auth">
                  <CodeBlock code={jsBasicAuth} language="javascript" />
                </Tab>
              </Tabs>
            </Tab>
            <Tab id="python" label="Python">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={pythonApiKey} language="python" />
                </Tab>
                <Tab id="basicauth" label="Basic Auth">
                  <CodeBlock code={pythonBasicAuth} language="python" />
                </Tab>
              </Tabs>
            </Tab>
            <Tab id="php" label="PHP">
              <Tabs defaultTab="apikey">
                <Tab id="apikey" label="API Key">
                  <CodeBlock code={phpApiKey} language="php" />
                </Tab>
                <Tab id="basicauth" label="Basic Auth">
                  <CodeBlock code={phpBasicAuth} language="php" />
                </Tab>
              </Tabs>
            </Tab>
            <Tab id="java" label="Java">
              <CodeBlock code={javaApiKey} language="java" />
            </Tab>
            <Tab id="go" label="Go">
              <CodeBlock code={goApiKey} language="go" />
            </Tab>
            <Tab id="ruby" label="Ruby">
              <CodeBlock code={rubyApiKey} language="ruby" />
            </Tab>
          </Tabs>
        </div>

        {/* Response */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Response</h2>
          
          <h3 className="text-xl font-bold text-slate-900 mb-4">Success Response</h3>
          <CodeBlock code={responseExample} language="json" />
          
          <h3 className="text-xl font-bold text-slate-900 mb-4 mt-8">Error Response</h3>
          <CodeBlock code={errorExample} language="json" />
          
          <div className="mt-6">
            <h4 className="font-semibold text-slate-900 mb-3">HTTP Status Codes</h4>
            <ul className="space-y-2 text-slate-600">
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">200</code> - Success</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">400</code> - Bad Request (invalid parameters)</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">401</code> - Unauthorized (invalid credentials)</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">402</code> - Payment Required (insufficient credits)</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">403</code> - Forbidden (sender ID not authorized)</li>
              <li><code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">500</code> - Internal Server Error</li>
            </ul>
          </div>
        </div>

        {/* Authentication */}
        <div className="mb-12">
          <Callout type="info" title="Authentication">
            All API requests require authentication. You can use either API keys (recommended) or username/password. 
            See the <a href="/developers/authentication" className="text-emerald-600 hover:text-emerald-700 underline">Authentication guide</a> for details.
          </Callout>
        </div>

        {/* Rate Limits */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Rate Limits</h2>
          <p className="text-slate-600 mb-4">
            API rate limits are based on your account tier:
          </p>
          <ul className="space-y-2 text-slate-600">
            <li>Free tier: 100 requests per minute</li>
            <li>Starter: 500 requests per minute</li>
            <li>Professional: 2,000 requests per minute</li>
            <li>Enterprise: Custom limits</li>
          </ul>
        </div>
      </div>
    </DocsLayout>
  )
}


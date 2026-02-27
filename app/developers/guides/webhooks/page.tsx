'use client'

import { DocsLayout } from '@/components/docs-layout'
import { Card } from '@/components/ui/card'

export default function WebhooksPage() {
  return (
    <DocsLayout>
      <div className="prose prose-slate max-w-none">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Webhooks
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            This guide explains what webhooks are and how to configure them in the platform
            for real-time Delivery Reports (DLR) and WhatsApp Mobile Originated (MO) responses.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What are Webhooks?</h2>
          <p className="text-slate-700 mb-4">
            Webhooks are a way for two systems to communicate with each other in real-time.
            They enable the automatic and instant delivery of data from one system (the sender)
            to another system (the receiver) whenever a specific event or trigger occurs.
          </p>
          <p className="text-slate-700 mb-4">
            Instead of the receiver continuously polling or requesting data from the sender,
            webhooks allow the sender to proactively push data to the receiver. This makes
            integrations more efficient, reduces latency, and simplifies your application logic.
          </p>
          <p className="text-slate-700 mb-4">
            Webhooks are commonly used to streamline data synchronization, automate workflows,
            and facilitate seamless integrations. By utilizing webhooks, you can receive timely
            updates, notifications, or data payloads whenever certain events or actions occur,
            enabling you to respond promptly and trigger corresponding actions in your system.
          </p>
          <Card className="p-6 bg-slate-50 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">How Webhooks Work</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>
                <strong>Event Trigger</strong>: An event or action occurs in the sender system,
                such as a new SMS delivery update, a WhatsApp message, or a status change.
              </li>
              <li>
                <strong>Webhook Registration</strong>: The receiver system registers a webhook
                with the sender system by providing a callback URL or endpoint where the data
                will be sent.
              </li>
              <li>
                <strong>Payload Delivery</strong>: When the event is triggered, the sender
                system packages relevant data into a payload and sends an HTTP request to the
                specified webhook URL.
              </li>
              <li>
                <strong>Receiver Handling</strong>: The receiver system processes the payload
                at the webhook endpoint and performs any necessary actions or updates.
              </li>
            </ol>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How to Use this Documentation</h2>
          <p className="text-slate-700">
            This page walks you through:
          </p>
          <ul className="list-disc list-inside text-slate-700 space-y-1 mt-2">
            <li>Adding a webhook for SMS / WhatsApp DLR (Delivery Reports)</li>
            <li>Adding a webhook for WhatsApp MO (Mobile Originated) responses</li>
            <li>Managing and reviewing all configured webhooks</li>
          </ul>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Add Webhook for DLR (SMS/WhatsApp)</h2>
          <p className="text-slate-700 mb-4">
            To receive real-time Delivery Receipts (DLRs), you can set up a webhook. This webhook
            can be used for all supported products, such as SMS and WhatsApp.
          </p>
          <Card className="p-6 bg-white border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Form Fields</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 mb-4">
              <li>
                <strong>Product</strong>: Select the product for which you want to create the webhook
                (e.g., SMS, WhatsApp).
              </li>
              <li>
                <strong>Webhook Server Send Method</strong>: Select the send method for the webhook
                (e.g., POST, GET, JSON, XML).
              </li>
              <li>
                <strong>Webhook Report Type</strong>: Select the type of report you want to receive
                via the webhook (e.g., DLR, MO). MO is not available for the SMS product.
              </li>
              <li>
                <strong>Waba Number (WhatsApp only)</strong>: Choose a Waba number from the list.
                This field will not appear for the SMS product.
              </li>
              <li>
                <strong>Webhook (URL Endpoint)</strong>: Enter the URL where you want to receive the
                webhook data.
              </li>
            </ol>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">Required Parameters</h3>
            <p className="text-slate-700 mb-3">
              Set the following required parameters for the webhook by specifying the parameter
              names that your endpoint expects:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li><strong>Transaction ID Parameter</strong>: Parameter name for the transaction ID.</li>
              <li><strong>Message ID Parameter</strong>: Parameter name for the message ID.</li>
              <li><strong>Error Code Parameter</strong>: Parameter name for the error code.</li>
              <li><strong>Mobile Number Parameter</strong>: Parameter name for the mobile number.</li>
              <li><strong>Received Time Parameter</strong>: Parameter name for the received time.</li>
              <li><strong>Delivered Time Parameter</strong>: Parameter name for the delivered time.</li>
            </ul>

            <p className="text-slate-700 mb-3">
              For WhatsApp-specific DLRs, you can also configure the following:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li><strong>Read Time Parameter</strong>: Parameter name for the read time.</li>
              <li><strong>Status Parameter</strong>: Parameter name for the status.</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">Custom Parameters &amp; Headers (Optional)</h3>
            <p className="text-slate-700 mb-2">
              Optionally, you can enrich webhook requests with additional data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>
                <strong>Add Custom Parameters</strong>: Enable this checkbox to add extra parameters
                (key–value pairs) that will be sent alongside the default fields. You can click
                <strong> Add More</strong> to add multiple parameters.
              </li>
              <li>
                <strong>Add Custom Headers</strong>: Enable this checkbox to include additional
                HTTP headers. You can also click <strong>Add More</strong> to define multiple headers.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">Testing &amp; Saving</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>
                Click <strong>Test Webhook</strong> to send a test request and preview the response
                from your endpoint.
              </li>
              <li>
                Once you are satisfied with the configuration, click <strong>Save</strong> to
                create the webhook. You can also add multiple custom parameters and headers
                using the <strong>Add More</strong> buttons.
              </li>
            </ul>
          </Card>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Add Webhook for WhatsApp’s MO Response</h2>
          <p className="text-slate-700 mb-4">
            To receive real-time MO (Mobile Originated) responses from WhatsApp, you can set up
            a dedicated webhook for the WhatsApp product.
          </p>
          <Card className="p-6 bg-white border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Form Fields</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 mb-4">
              <li>
                <strong>Product</strong>: Select the product for which you want to create the webhook.
                For MO responses, choose <strong>WhatsApp</strong>.
              </li>
              <li>
                <strong>Webhook Server Send Method</strong>: Select the HTTP method used for sending
                the webhook (POST, GET, JSON, or XML).
              </li>
              <li>
                <strong>Webhook Report Type</strong>: Select <strong>MO</strong> as the report type.
              </li>
              <li>
                <strong>Waba Number</strong>: If applicable, select the specific Waba number.
              </li>
              <li>
                <strong>Webhook (URL Endpoint)</strong>: Provide the full URL (including protocol,
                e.g., <code>https://</code>) where MO data will be sent.
              </li>
            </ol>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">Custom Parameters &amp; Headers (Optional)</h3>
            <p className="text-slate-700 mb-2">
              You can also include custom parameters and headers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li>
                Enable <strong>Add Custom Parameters</strong> and define any extra parameters
                your endpoint expects. Use <strong>Add More</strong> to define multiple entries.
              </li>
              <li>
                Enable <strong>Add Custom Headers</strong> and set any additional HTTP headers
                needed by your system. Again, use <strong>Add More</strong> to add several headers.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">Testing &amp; Saving</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>
                Click <strong>Test Webhook</strong> to validate that your endpoint is reachable
                and that it handles the payload as expected. The test response will be shown
                in the <strong>Webhook Test Response</strong> section.
              </li>
              <li>
                Click <strong>Save Changes</strong> to persist the webhook configuration.
              </li>
            </ul>
          </Card>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Manage Webhooks</h2>
          <p className="text-slate-700 mb-4">
            The <strong>Manage Webhooks</strong> section lets you review and maintain all
            configured webhooks for DLR and MO.
          </p>
          <Card className="p-6 bg-white border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">View Webhooks</h3>
            <p className="text-slate-700 mb-3">
              The webhooks table typically includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 mb-4">
              <li><strong>ID</strong>: Unique identifier for each webhook.</li>
              <li><strong>Product</strong>: The product associated with the webhook (SMS, WhatsApp, etc.).</li>
              <li><strong>Webhook</strong>: The URL endpoint where webhook data is sent.</li>
              <li><strong>Report Type</strong>: The report type (DLR or MO).</li>
              <li><strong>Server Method</strong>: The HTTP/send method used (POST, GET, JSON, XML).</li>
              <li><strong>Product Unique ID</strong>: A product-specific identifier, such as a Waba number.</li>
              <li><strong>Action</strong>: Controls for editing, deleting, or viewing details.</li>
            </ul>
            <p className="text-slate-700 mb-4">
              If no webhooks have been configured yet, the table will display a message indicating
              that there are no entries.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mb-3">Available Actions</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li><strong>Edit</strong>: Update the webhook configuration.</li>
              <li><strong>Delete</strong>: Remove the webhook from the system.</li>
              <li><strong>View Details</strong>: Inspect the full configuration of a webhook.</li>
            </ul>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Next Steps</h2>
          <p className="text-slate-700">
            Once you have created and saved your webhooks, the platform will start sending
            real-time DLR and MO data to the specified webhook URLs based on your configuration.
            If you have any questions or need further assistance, contact support.
          </p>
        </div>
      </div>
    </DocsLayout>
  )
}

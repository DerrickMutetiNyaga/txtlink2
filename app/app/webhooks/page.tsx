'use client'

import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  Eye,
  TestTube,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface WebhookConfig {
  id: string
  name?: string
  product: 'SMS' | 'WhatsApp'
  serverSendMethod: 'POST' | 'GET' | 'JSON' | 'XML'
  reportType: 'DLR' | 'MO'
  wabaNumber?: string
  url: string
  transactionIdParam?: string
  messageIdParam?: string
  errorCodeParam?: string
  mobileNumberParam?: string
  receivedTimeParam?: string
  deliveredTimeParam?: string
  readTimeParam?: string
  statusParam?: string
  customParameters?: Array<{ name: string; value: string }>
  customHeaders?: Array<{ name: string; value: string }>
  status: 'active' | 'inactive'
  lastTriggeredAt?: string | Date | null
  lastTestResponse?: string
  createdAt: string | Date
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [hasSenderIds, setHasSenderIds] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'DLR' | 'MO'>('DLR')
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResponse, setTestResponse] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    product: 'SMS' as 'SMS' | 'WhatsApp',
    serverSendMethod: 'POST' as 'POST' | 'GET' | 'JSON' | 'XML',
    reportType: 'DLR' as 'DLR' | 'MO',
    wabaNumber: '',
    url: '',
    transactionIdParam: '',
    messageIdParam: '',
    errorCodeParam: '',
    mobileNumberParam: '',
    receivedTimeParam: '',
    deliveredTimeParam: '',
    readTimeParam: '',
    statusParam: '',
    addCustomParams: false,
    customParameters: [] as Array<{ name: string; value: string }>,
    addCustomHeaders: false,
    customHeaders: [] as Array<{ name: string; value: string }>,
  })
  const [creating, setCreating] = useState(false)

  // Fetch webhooks
  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/webhooks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setWebhooks(data.webhooks || [])
        setHasSenderIds(data.hasSenderIds || false)
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      product: 'SMS',
      serverSendMethod: 'POST',
      reportType: 'DLR',
      wabaNumber: '',
      url: '',
      transactionIdParam: '',
      messageIdParam: '',
      errorCodeParam: '',
      mobileNumberParam: '',
      receivedTimeParam: '',
      deliveredTimeParam: '',
      readTimeParam: '',
      statusParam: '',
      addCustomParams: false,
      customParameters: [],
      addCustomHeaders: false,
      customHeaders: [],
    })
    setEditingWebhook(null)
    setTestResponse('')
  }

  const openModal = (type: 'DLR' | 'MO', webhook?: WebhookConfig) => {
    setModalType(type)
    if (webhook) {
      setEditingWebhook(webhook)
      setFormData({
        name: webhook.name || '',
        product: webhook.product,
        serverSendMethod: webhook.serverSendMethod,
        reportType: webhook.reportType,
        wabaNumber: webhook.wabaNumber || '',
        url: webhook.url,
        transactionIdParam: webhook.transactionIdParam || '',
        messageIdParam: webhook.messageIdParam || '',
        errorCodeParam: webhook.errorCodeParam || '',
        mobileNumberParam: webhook.mobileNumberParam || '',
        receivedTimeParam: webhook.receivedTimeParam || '',
        deliveredTimeParam: webhook.deliveredTimeParam || '',
        readTimeParam: webhook.readTimeParam || '',
        statusParam: webhook.statusParam || '',
        addCustomParams: (webhook.customParameters?.length || 0) > 0,
        customParameters: webhook.customParameters || [],
        addCustomHeaders: (webhook.customHeaders?.length || 0) > 0,
        customHeaders: webhook.customHeaders || [],
      })
    } else {
      resetForm()
      setFormData((prev) => ({ ...prev, reportType: type }))
    }
    setShowModal(true)
  }

  const handleCreateWebhook = async () => {
    // Validation
    if (!formData.url.trim()) {
      alert('Webhook URL is required')
      return
    }

    if (formData.reportType === 'DLR') {
      if (
        !formData.transactionIdParam ||
        !formData.messageIdParam ||
        !formData.errorCodeParam ||
        !formData.mobileNumberParam ||
        !formData.receivedTimeParam ||
        !formData.deliveredTimeParam
      ) {
        alert('All required parameters must be specified for DLR webhooks')
        return
      }
    }

    if (formData.product === 'WhatsApp' && !formData.wabaNumber) {
      alert('Waba Number is required for WhatsApp webhooks')
      return
    }

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingWebhook
        ? `/api/user/webhooks/${editingWebhook.id}`
        : '/api/user/webhooks'
      const method = editingWebhook ? 'PATCH' : 'POST'

      const payload: any = {
        ...formData,
        customParameters: formData.addCustomParams ? formData.customParameters : [],
        customHeaders: formData.addCustomHeaders ? formData.customHeaders : [],
      }

      if (!editingWebhook) {
        delete payload.addCustomParams
        delete payload.addCustomHeaders
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchWebhooks()
        setShowModal(false)
        resetForm()
        alert(editingWebhook ? 'Webhook updated successfully!' : 'Webhook created successfully!')
      } else {
        alert(data.error || 'Failed to save webhook')
      }
    } catch (error) {
      console.error('Failed to save webhook:', error)
      alert('Failed to save webhook')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return
    }

    setDeleting(id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/user/webhooks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchWebhooks()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete webhook')
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error)
      alert('Failed to delete webhook')
    } finally {
      setDeleting(null)
    }
  }

  const handleTestWebhook = async (webhookId: string) => {
    setTesting(webhookId)
    setTestResponse('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'test',
          webhookId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setTestResponse(data.response || 'Success: Webhook test completed')
      } else {
        setTestResponse(`Error: ${data.error || 'Test failed'}`)
      }
      await fetchWebhooks()
    } catch (error) {
      setTestResponse(`Error: ${error}`)
    } finally {
      setTesting(null)
    }
  }

  const addCustomParam = () => {
    setFormData((prev) => ({
      ...prev,
      customParameters: [...prev.customParameters, { name: '', value: '' }],
    }))
  }

  const updateCustomParam = (index: number, field: 'name' | 'value', value: string) => {
    setFormData((prev) => ({
      ...prev,
      customParameters: prev.customParameters.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }))
  }

  const removeCustomParam = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customParameters: prev.customParameters.filter((_, i) => i !== index),
    }))
  }

  const addCustomHeader = () => {
    setFormData((prev) => ({
      ...prev,
      customHeaders: [...prev.customHeaders, { name: '', value: '' }],
    }))
  }

  const updateCustomHeader = (index: number, field: 'name' | 'value', value: string) => {
    setFormData((prev) => ({
      ...prev,
      customHeaders: prev.customHeaders.map((h, i) =>
        i === index ? { ...h, [field]: value } : h
      ),
    }))
  }

  const removeCustomHeader = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customHeaders: prev.customHeaders.filter((_, i) => i !== index),
    }))
  }

  return (
    <PortalLayout activeSection="Webhooks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">Webhooks</h1>
            <p className="text-slate-600">Configure webhooks to receive real-time DLR and MO responses</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-gradient-to-r from-[#059669] to-[#14B8A6] text-white hover:from-[#064E3B] hover:to-[#059669]"
              onClick={() => openModal('DLR')}
            >
              <Plus size={18} className="mr-2" /> Add DLR Webhook
            </Button>
            <Button
              className="bg-gradient-to-r from-[#059669] to-[#14B8A6] text-white hover:from-[#064E3B] hover:to-[#059669]"
              onClick={() => openModal('MO')}
            >
              <Plus size={18} className="mr-2" /> Add MO Webhook
            </Button>
          </div>
        </div>

        {/* Webhooks Table */}
        {loading ? (
          <Card className="p-12 bg-white border border-slate-200 shadow-sm text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Loading webhooks...</p>
          </Card>
        ) : webhooks.length === 0 ? (
          <Card className="p-16 bg-white border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 mb-6">
                <Webhook size={48} className="text-teal-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Webhooks Yet</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Create webhooks to receive real-time DLR and MO notifications.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Webhook</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Report Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Server Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product Unique ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">
                        {webhook.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">{webhook.product}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono max-w-xs truncate">
                        {webhook.url}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">{webhook.reportType}</td>
                      <td className="py-3 px-4 text-sm text-slate-900">{webhook.serverSendMethod}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {webhook.wabaNumber || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {webhook.status === 'active' ? (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestWebhook(webhook.id)}
                            disabled={testing === webhook.id}
                            title="Test Webhook"
                          >
                            <TestTube size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openModal(webhook.reportType, webhook)}
                            title="Edit Webhook"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            disabled={deleting === webhook.id}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Webhook"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Create/Edit Webhook Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-4xl p-8 bg-white border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-teal-100 text-teal-600">
                    <Webhook size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {editingWebhook ? 'Edit' : 'Add'} Webhook for{' '}
                    {modalType === 'DLR' ? 'DLR (SMS/WhatsApp)' : "WhatsApp's MO Response"}
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}>
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">Product *</Label>
                    <Select
                      value={formData.product}
                      onValueChange={(value: 'SMS' | 'WhatsApp') =>
                        setFormData((prev) => ({ ...prev, product: value, wabaNumber: value === 'SMS' ? '' : prev.wabaNumber }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="serverSendMethod">Webhook Server Send Method *</Label>
                    <Select
                      value={formData.serverSendMethod}
                      onValueChange={(value: 'POST' | 'GET' | 'JSON' | 'XML') =>
                        setFormData((prev) => ({ ...prev, serverSendMethod: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="JSON">JSON</SelectItem>
                        <SelectItem value="XML">XML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reportType">Webhook Report Type *</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(value: 'DLR' | 'MO') =>
                      setFormData((prev) => ({ ...prev, reportType: value }))
                    }
                    disabled={formData.product === 'SMS'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DLR">DLR</SelectItem>
                      <SelectItem value="MO" disabled={formData.product === 'SMS'}>MO</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.product === 'SMS' && (
                    <p className="text-xs text-slate-500 mt-1">MO is disabled for SMS product</p>
                  )}
                </div>

                {formData.product === 'WhatsApp' && (
                  <div>
                    <Label htmlFor="wabaNumber">Waba Number *</Label>
                    <Input
                      id="wabaNumber"
                      value={formData.wabaNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, wabaNumber: e.target.value }))}
                      placeholder="Enter Waba number"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="url">Webhook (URL Endpoint) *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://api.example.com/webhook"
                  />
                </div>

                {/* Required Parameters for DLR */}
                {formData.reportType === 'DLR' && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-semibold text-slate-900">Required Parameters</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="transactionIdParam">Transaction ID Parameter *</Label>
                        <Input
                          id="transactionIdParam"
                          value={formData.transactionIdParam}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, transactionIdParam: e.target.value }))
                          }
                          placeholder="Transactionid"
                        />
                      </div>
                      <div>
                        <Label htmlFor="messageIdParam">Message ID Parameter *</Label>
                        <Input
                          id="messageIdParam"
                          value={formData.messageIdParam}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, messageIdParam: e.target.value }))
                          }
                          placeholder="Messageid"
                        />
                      </div>
                      <div>
                        <Label htmlFor="errorCodeParam">Error Code Parameter *</Label>
                        <Input
                          id="errorCodeParam"
                          value={formData.errorCodeParam}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, errorCodeParam: e.target.value }))
                          }
                          placeholder="ErrorCode"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobileNumberParam">Mobile Number Parameter *</Label>
                        <Input
                          id="mobileNumberParam"
                          value={formData.mobileNumberParam}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, mobileNumberParam: e.target.value }))
                          }
                          placeholder="mobileNo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receivedTimeParam">Received Time Parameter *</Label>
                        <Input
                          id="receivedTimeParam"
                          value={formData.receivedTimeParam}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, receivedTimeParam: e.target.value }))
                          }
                          placeholder="ReceivedTime"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deliveredTimeParam">Delivered Time Parameter *</Label>
                        <Input
                          id="deliveredTimeParam"
                          value={formData.deliveredTimeParam}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, deliveredTimeParam: e.target.value }))
                          }
                          placeholder="DeliveredTime"
                        />
                      </div>
                    </div>

                    {/* WhatsApp-specific parameters */}
                    {formData.product === 'WhatsApp' && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label htmlFor="readTimeParam">Read Time Parameter</Label>
                          <Input
                            id="readTimeParam"
                            value={formData.readTimeParam}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, readTimeParam: e.target.value }))
                            }
                            placeholder="ReadTime"
                          />
                        </div>
                        <div>
                          <Label htmlFor="statusParam">Status Parameter</Label>
                          <Input
                            id="statusParam"
                            value={formData.statusParam}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, statusParam: e.target.value }))
                            }
                            placeholder="Status"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Parameters */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="addCustomParams"
                      checked={formData.addCustomParams}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, addCustomParams: checked as boolean }))
                      }
                    />
                    <Label htmlFor="addCustomParams" className="font-semibold">
                      Add Custom Parameters
                    </Label>
                  </div>
                  {formData.addCustomParams && (
                    <div className="space-y-2">
                      {formData.customParameters.map((param, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Parameter name"
                            value={param.name}
                            onChange={(e) => updateCustomParam(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Parameter value"
                            value={param.value}
                            onChange={(e) => updateCustomParam(index, 'value', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomParam(index)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addCustomParam}>
                        <Plus size={16} className="mr-2" /> Add More
                      </Button>
                    </div>
                  )}
                </div>

                {/* Custom Headers */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="addCustomHeaders"
                      checked={formData.addCustomHeaders}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, addCustomHeaders: checked as boolean }))
                      }
                    />
                    <Label htmlFor="addCustomHeaders" className="font-semibold">
                      Add Custom Headers
                    </Label>
                  </div>
                  {formData.addCustomHeaders && (
                    <div className="space-y-2">
                      {formData.customHeaders.map((header, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Header name"
                            value={header.name}
                            onChange={(e) => updateCustomHeader(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Header value"
                            value={header.value}
                            onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomHeader(index)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addCustomHeader}>
                        <Plus size={16} className="mr-2" /> Add More
                      </Button>
                    </div>
                  )}
                </div>

                {/* Test Webhook Response */}
                {testResponse && (
                  <div className="border-t pt-4">
                    <Label>Webhook Test Response</Label>
                    <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap">{testResponse}</pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 border-t pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  {editingWebhook && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleTestWebhook(editingWebhook.id)}
                      disabled={testing === editingWebhook.id}
                    >
                      <TestTube size={16} className="mr-2" />
                      {testing === editingWebhook.id ? 'Testing...' : 'Test Webhook'}
                    </Button>
                  )}
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#059669] to-[#14B8A6] text-white hover:from-[#064E3B] hover:to-[#059669] disabled:opacity-50"
                    onClick={handleCreateWebhook}
                    disabled={creating}
                  >
                    {creating ? 'Saving...' : editingWebhook ? 'Save Changes' : 'Save'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

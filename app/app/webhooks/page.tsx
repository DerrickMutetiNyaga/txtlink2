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
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  TestTube,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

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

const fieldClass =
  'h-11 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] placeholder:text-[#94A3B8] shadow-none focus-visible:border-[#2F9B73] focus-visible:ring-2 focus-visible:ring-[#2F9B73]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0] [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#FFFFFF_inset]'

const selectTriggerClass =
  'h-11 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] shadow-none focus:ring-2 focus:ring-[#2F9B73]/20 focus:ring-offset-0 focus:border-[#2F9B73] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0] data-[placeholder]:text-[#94A3B8]'

const selectContentClass =
  'z-[60] max-h-[min(240px,calc(100dvh-12rem))] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg'

const labelClass = 'text-sm font-medium text-[#0F172A] mb-1.5 block'

const sectionTitleClass = 'text-sm font-semibold text-[#0F172A]'

const helperClass = 'text-xs text-[#64748B] mt-1'

const outlineActionClass =
  'inline-flex items-center justify-center gap-2 h-[42px] w-full sm:w-auto px-4 rounded-[10px] border border-[#E2E8F0] bg-white text-sm font-medium text-[#2F9B73] hover:bg-[#ECFDF5] hover:border-[#2F9B73]/30 transition-colors'

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

  useEffect(() => {
    fetchWebhooks()
  }, [])

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal])

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

  const closeModal = () => {
    setShowModal(false)
    resetForm()
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

  const renderStatusBadge = (status: WebhookConfig['status']) =>
    status === 'active' ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#047857]">
        <CheckCircle size={12} /> Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-[#64748B]">
        <XCircle size={12} /> Inactive
      </span>
    )

  const renderWebhookActions = (webhook: WebhookConfig, mobile = false) => (
    <div className={cn('flex gap-2', mobile && 'grid grid-cols-3 pt-3 border-t border-[#E2E8F0]')}>
      <Button
        variant="outline"
        size={mobile ? 'default' : 'sm'}
        onClick={() => handleTestWebhook(webhook.id)}
        disabled={testing === webhook.id}
        title="Test Webhook"
        className={cn(
          mobile && 'h-11 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]',
          !mobile && 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
        )}
      >
        <TestTube size={14} />
        {mobile && <span className="ml-1.5">Test</span>}
      </Button>
      <Button
        variant="outline"
        size={mobile ? 'default' : 'sm'}
        onClick={() => openModal(webhook.reportType, webhook)}
        title="Edit Webhook"
        className={cn(
          mobile && 'h-11 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]',
          !mobile && 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
        )}
      >
        <Edit size={14} />
        {mobile && <span className="ml-1.5">Edit</span>}
      </Button>
      <Button
        variant="outline"
        size={mobile ? 'default' : 'sm'}
        onClick={() => handleDeleteWebhook(webhook.id)}
        disabled={deleting === webhook.id}
        title="Delete Webhook"
        className={cn(
          'text-[#EF4444] hover:text-[#EF4444] hover:bg-red-50 border-red-200',
          mobile && 'h-11 rounded-xl'
        )}
      >
        <Trash2 size={14} />
        {mobile && <span className="ml-1.5">Delete</span>}
      </Button>
    </div>
  )

  const modalTitle = editingWebhook
    ? `Edit Webhook for ${modalType}`
    : modalType === 'DLR'
      ? 'Add Webhook for DLR'
      : 'Add Webhook for MO'

  return (
    <PortalLayout activeSection="Webhooks">
      <div className="space-y-4 md:space-y-6 w-full max-w-full min-w-0">
        {/* Header */}
        <div className="app-page-header">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] mb-1 sm:mb-2">Webhooks</h1>
            <p className="text-sm sm:text-base text-[#64748B]">
              Configure webhooks to receive real-time DLR and MO responses.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
            <Button
              className="w-full md:w-auto h-11 rounded-xl bg-[#2F9B73] text-white hover:bg-[#267D5E] shadow-sm"
              onClick={() => openModal('DLR')}
            >
              <Plus size={18} className="mr-2" /> Add DLR Webhook
            </Button>
            <Button
              className="w-full md:w-auto h-11 rounded-xl bg-[#2F9B73] text-white hover:bg-[#267D5E] shadow-sm"
              onClick={() => openModal('MO')}
            >
              <Plus size={18} className="mr-2" /> Add MO Webhook
            </Button>
          </div>
        </div>

        {/* Webhooks list */}
        {loading ? (
          <Card className="p-12 bg-white border border-[#E2E8F0] shadow-sm text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#64748B]" />
            <p className="text-[#64748B]">Loading webhooks...</p>
          </Card>
        ) : webhooks.length === 0 ? (
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white px-5 py-8 sm:py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5]">
              <Webhook size={28} className="text-[#2F9B73]" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#0F172A] mb-2">No Webhooks Yet</h3>
            <p className="text-sm text-[#64748B] max-w-sm mx-auto leading-relaxed">
              Create webhooks to receive real-time DLR and MO notifications.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block p-6 bg-white border border-[#E2E8F0] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Webhook</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Report Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Server Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Product Unique ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#64748B]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((webhook) => (
                      <tr key={webhook.id} className="border-b border-[#E2E8F0]/60 hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 text-sm text-[#64748B] font-mono">
                          {webhook.id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-sm text-[#0F172A]">{webhook.product}</td>
                        <td className="py-3 px-4 text-sm text-[#64748B] font-mono max-w-xs truncate">
                          {webhook.url}
                        </td>
                        <td className="py-3 px-4 text-sm text-[#0F172A]">{webhook.reportType}</td>
                        <td className="py-3 px-4 text-sm text-[#0F172A]">{webhook.serverSendMethod}</td>
                        <td className="py-3 px-4 text-sm text-[#64748B]">{webhook.wabaNumber || '-'}</td>
                        <td className="py-3 px-4">{renderStatusBadge(webhook.status)}</td>
                        <td className="py-3 px-4">{renderWebhookActions(webhook)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm w-full min-w-0"
                >
                  <div className="flex items-start justify-between gap-3 mb-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{webhook.reportType} · {webhook.product}</p>
                      <p className="text-xs text-[#64748B] font-mono truncate mt-0.5">{webhook.url}</p>
                    </div>
                    {renderStatusBadge(webhook.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-1">
                    <div>
                      <p className="text-xs text-[#64748B]">Method</p>
                      <p className="font-medium text-[#0F172A]">{webhook.serverSendMethod}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">ID</p>
                      <p className="font-mono text-xs text-[#64748B] truncate">{webhook.id.substring(0, 12)}…</p>
                    </div>
                  </div>
                  {renderWebhookActions(webhook, true)}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Create/Edit Webhook Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="flex w-[calc(100vw-32px)] max-w-[560px] max-h-[calc(100vh-48px)] flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-[#E2E8F0] bg-white px-4 py-4 sm:px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#2F9B73]">
                  <Webhook size={20} />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] leading-snug">
                    {modalTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                    Configure delivery report callback settings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 space-y-6">
                {/* Section 1: Webhook Settings */}
                <section className="space-y-4">
                  <h4 className={sectionTitleClass}>Webhook Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product" className={labelClass}>
                        Product <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Select
                        value={formData.product}
                        onValueChange={(value: 'SMS' | 'WhatsApp') =>
                          setFormData((prev) => ({
                            ...prev,
                            product: value,
                            wabaNumber: value === 'SMS' ? '' : prev.wabaNumber,
                          }))
                        }
                      >
                        <SelectTrigger id="product" className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={selectContentClass}
                          position="popper"
                          sideOffset={4}
                          collisionPadding={16}
                        >
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="serverSendMethod" className={labelClass}>
                        Webhook Server Send Method <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Select
                        value={formData.serverSendMethod}
                        onValueChange={(value: 'POST' | 'GET' | 'JSON' | 'XML') =>
                          setFormData((prev) => ({ ...prev, serverSendMethod: value }))
                        }
                      >
                        <SelectTrigger id="serverSendMethod" className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={selectContentClass}
                          position="popper"
                          sideOffset={4}
                          collisionPadding={16}
                        >
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="JSON">JSON</SelectItem>
                          <SelectItem value="XML">XML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reportType" className={labelClass}>
                      Webhook Report Type <span className="text-[#EF4444]">*</span>
                    </Label>
                    <Select
                      value={formData.reportType}
                      onValueChange={(value: 'DLR' | 'MO') =>
                        setFormData((prev) => ({ ...prev, reportType: value }))
                      }
                      disabled={formData.product === 'SMS'}
                    >
                      <SelectTrigger id="reportType" className={selectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        className={selectContentClass}
                        position="popper"
                        sideOffset={4}
                        collisionPadding={16}
                      >
                        <SelectItem value="DLR">DLR</SelectItem>
                        <SelectItem value="MO" disabled={formData.product === 'SMS'}>
                          MO
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.product === 'SMS' && (
                      <p className={helperClass}>MO is disabled for SMS product</p>
                    )}
                  </div>

                  {formData.product === 'WhatsApp' && (
                    <div>
                      <Label htmlFor="wabaNumber" className={labelClass}>
                        Waba Number <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        id="wabaNumber"
                        value={formData.wabaNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, wabaNumber: e.target.value }))
                        }
                        placeholder="Enter Waba number"
                        className={fieldClass}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="url" className={labelClass}>
                      Webhook URL Endpoint <span className="text-[#EF4444]">*</span>
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                      placeholder="https://api.example.com/webhook"
                      className={fieldClass}
                    />
                  </div>
                </section>

                {/* Section 2: Required Parameters */}
                {formData.reportType === 'DLR' && (
                  <section className="space-y-4 border-t border-[#E2E8F0] pt-6">
                    <h4 className={sectionTitleClass}>Required Parameters</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'transactionIdParam', label: 'Transaction ID Parameter', placeholder: 'Transactionid' },
                        { id: 'messageIdParam', label: 'Message ID Parameter', placeholder: 'Messageid' },
                        { id: 'errorCodeParam', label: 'Error Code Parameter', placeholder: 'ErrorCode' },
                        { id: 'mobileNumberParam', label: 'Mobile Number Parameter', placeholder: 'mobileNo' },
                        { id: 'receivedTimeParam', label: 'Received Time Parameter', placeholder: 'ReceivedTime' },
                        { id: 'deliveredTimeParam', label: 'Delivered Time Parameter', placeholder: 'DeliveredTime' },
                      ].map((field) => (
                        <div key={field.id}>
                          <Label htmlFor={field.id} className={labelClass}>
                            {field.label} <span className="text-[#EF4444]">*</span>
                          </Label>
                          <Input
                            id={field.id}
                            value={formData[field.id as keyof typeof formData] as string}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className={fieldClass}
                          />
                        </div>
                      ))}
                    </div>

                    {formData.product === 'WhatsApp' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="readTimeParam" className={labelClass}>
                            Read Time Parameter
                          </Label>
                          <Input
                            id="readTimeParam"
                            value={formData.readTimeParam}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, readTimeParam: e.target.value }))
                            }
                            placeholder="ReadTime"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <Label htmlFor="statusParam" className={labelClass}>
                            Status Parameter
                          </Label>
                          <Input
                            id="statusParam"
                            value={formData.statusParam}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, statusParam: e.target.value }))
                            }
                            placeholder="Status"
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Section 3: Optional */}
                <section className="space-y-4 border-t border-[#E2E8F0] pt-6">
                  <h4 className={sectionTitleClass}>Optional</h4>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, addCustomParams: !prev.addCustomParams }))
                    }
                    className={cn(
                      outlineActionClass,
                      formData.addCustomParams && 'border-[#2F9B73] bg-[#ECFDF5]'
                    )}
                  >
                    <Plus size={16} />
                    Add Custom Parameters
                  </button>
                  {formData.addCustomParams && (
                    <div className="space-y-2">
                      {formData.customParameters.map((param, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 min-w-0">
                          <Input
                            placeholder="Parameter name"
                            value={param.name}
                            onChange={(e) => updateCustomParam(index, 'name', e.target.value)}
                            className={cn(fieldClass, 'flex-1 min-w-0')}
                          />
                          <Input
                            placeholder="Parameter value"
                            value={param.value}
                            onChange={(e) => updateCustomParam(index, 'value', e.target.value)}
                            className={cn(fieldClass, 'flex-1 min-w-0')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomParam(index)}
                            className="h-11 shrink-0 border-[#E2E8F0] bg-white hover:bg-red-50 text-[#EF4444]"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                      <button type="button" onClick={addCustomParam} className={outlineActionClass}>
                        <Plus size={16} className="mr-1" /> Add More
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, addCustomHeaders: !prev.addCustomHeaders }))
                    }
                    className={cn(
                      outlineActionClass,
                      formData.addCustomHeaders && 'border-[#2F9B73] bg-[#ECFDF5]'
                    )}
                  >
                    <Plus size={16} />
                    Add Custom Headers
                  </button>
                  {formData.addCustomHeaders && (
                    <div className="space-y-2">
                      {formData.customHeaders.map((header, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 min-w-0">
                          <Input
                            placeholder="Header name"
                            value={header.name}
                            onChange={(e) => updateCustomHeader(index, 'name', e.target.value)}
                            className={cn(fieldClass, 'flex-1 min-w-0')}
                          />
                          <Input
                            placeholder="Header value"
                            value={header.value}
                            onChange={(e) => updateCustomHeader(index, 'value', e.target.value)}
                            className={cn(fieldClass, 'flex-1 min-w-0')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomHeader(index)}
                            className="h-11 shrink-0 border-[#E2E8F0] bg-white hover:bg-red-50 text-[#EF4444]"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                      <button type="button" onClick={addCustomHeader} className={outlineActionClass}>
                        <Plus size={16} className="mr-1" /> Add More
                      </button>
                    </div>
                  )}
                </section>

                {testResponse && (
                  <section className="border-t border-[#E2E8F0] pt-6">
                    <Label className={labelClass}>Webhook Test Response</Label>
                    <div className="mt-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 max-w-full overflow-x-auto">
                      <pre className="text-xs text-[#64748B] whitespace-pre-wrap break-words">
                        {testResponse}
                      </pre>
                    </div>
                  </section>
                )}
              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 z-10 border-t border-[#E2E8F0] bg-white px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    className="h-[46px] w-full sm:w-auto sm:min-w-[120px] rounded-xl bg-[#2F9B73] text-white hover:bg-[#267D5E] disabled:opacity-50 order-1"
                    onClick={handleCreateWebhook}
                    disabled={creating}
                  >
                    {creating ? 'Saving...' : editingWebhook ? 'Save Changes' : 'Save'}
                  </Button>
                  {editingWebhook && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-[46px] w-full sm:w-auto sm:min-w-[120px] rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] order-2 sm:order-none"
                      onClick={() => handleTestWebhook(editingWebhook.id)}
                      disabled={testing === editingWebhook.id}
                    >
                      <TestTube size={16} className="mr-2" />
                      {testing === editingWebhook.id ? 'Testing...' : 'Test Webhook'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-[46px] w-full sm:w-auto sm:min-w-[120px] rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] order-3 sm:order-none"
                    onClick={closeModal}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Globe,
  Radio,
  DollarSign,
  Shield,
  Database,
  AlertTriangle,
  Save,
  RefreshCw,
  Key,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Phone,
} from 'lucide-react'

interface SystemSettings {
  _id?: string
  platformName: string
  defaultCurrency: string
  timezone: string
  dateFormat: string
  environment: 'production' | 'sandbox'
  providerName: string
  providerApiKey: string
  defaultProviderCostPerPart: number
  retryPolicy: number
  deliveryReportWebhookEnabled: boolean
  globalDefaultPricePerPart: number
  globalProviderCostPerPart: number
  defaultChargeOnFailure: boolean
  defaultRefundOnFailure: boolean
  requireSenderIdApproval: boolean
  logAllAdminActions: boolean
  lockPricingEditsToSuperAdmin: boolean
  enableIpLogging: boolean
  defaultSmsEncoding: 'auto' | 'gsm7' | 'ucs2'
  defaultSenderIdBehavior: string
  defaultAccountCreditLimit: number
  smsSendingEnabled: boolean
  // M-Pesa Configuration
  mpesaConsumerKey?: string
  mpesaConsumerSecret?: string
  mpesaPasskey?: string
  mpesaShortcode?: string
  mpesaConfirmationUrl?: string
  mpesaValidationUrl?: string
  mpesaCallbackUrl?: string
  mpesaEnvironment?: 'sandbox' | 'production'
  mpesaEnabled?: boolean
  
  // HostPinnacle Configuration
  hostpinnacleBaseUrl?: string
  hostpinnacleUserId?: string
  hostpinnaclePassword?: string
  hostpinnacleApiKey?: string
  hostpinnacleStatusEndpoint?: string
  hostpinnacleTimeout?: number
  hostpinnacleSmsSendTimeout?: number
  hostpinnacleStatusTimeout?: number
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showMpesaCredentials, setShowMpesaCredentials] = useState({
    consumerKey: false,
    consumerSecret: false,
    passkey: false,
  })
  const [showHostPinnacleCredentials, setShowHostPinnacleCredentials] = useState({
    userId: false,
    password: false,
    apiKey: false,
  })
  const [dangerAction, setDangerAction] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<SystemSettings>>({})
  const [registeringUrls, setRegisteringUrls] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [dlrTestMobile, setDlrTestMobile] = useState('')
  const [dlrTestMessage, setDlrTestMessage] = useState('DLR test from TXTLINK')
  const [dlrTestSending, setDlrTestSending] = useState(false)
  const [dlrTestResult, setDlrTestResult] = useState<{ success: true; transactionId: string } | { success: false; error: string } | null>(null)
  const [dlrDeliveryStatus, setDlrDeliveryStatus] = useState<'sent' | 'delivered' | 'failed' | null>(null)
  const [dlrCheckLoading, setDlrCheckLoading] = useState(false)
  const [simulationData, setSimulationData] = useState({
    phoneNumber: '',
    amount: '',
    billRefNumber: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          window.location.href = '/auth/login'
          return
        }
        throw new Error('Failed to fetch settings')
      }

      const result = await response.json()
      setSettings(result.data)
      setFormData(result.data)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to save settings')
        return
      }

      const result = await response.json()
      setSettings(result.data)
      setFormData(result.data)
      alert('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDangerAction = async (action: string) => {
    // These would call specific API endpoints for dangerous actions
    alert(`Danger action "${action}" would be executed here. This requires separate API endpoints.`)
    setDangerAction(null)
  }

  const handleRegisterC2BUrls = async () => {
    if (!formData.mpesaValidationUrl || !formData.mpesaConfirmationUrl) {
      alert('Please configure Validation URL and Confirmation URL first')
      return
    }

    try {
      setRegisteringUrls(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/mpesa/register-c2b-urls', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Failed to register C2B URLs')
        return
      }

      alert('C2B URLs registered successfully!')
    } catch (error) {
      console.error('Error registering C2B URLs:', error)
      alert('Failed to register C2B URLs')
    } finally {
      setRegisteringUrls(false)
    }
  }

  const handleSimulateC2B = async () => {
    if (!simulationData.phoneNumber || !simulationData.amount) {
      alert('Please enter phone number and amount')
      return
    }

    if (formData.mpesaEnvironment === 'production') {
      alert('C2B simulation is not supported in production. Use M-Pesa App, USSD, or Sim Toolkit.')
      return
    }

    try {
      setSimulating(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/mpesa/simulate-c2b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: simulationData.phoneNumber,
          amount: parseFloat(simulationData.amount),
          billRefNumber: simulationData.billRefNumber || '',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Failed to simulate C2B payment')
        return
      }

      alert('C2B payment simulated successfully! Check your callbacks.')
      setSimulationData({ phoneNumber: '', amount: '', billRefNumber: '' })
    } catch (error) {
      console.error('Error simulating C2B:', error)
      alert('Failed to simulate C2B payment')
    } finally {
      setSimulating(false)
    }
  }

  const updateField = (field: keyof SystemSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="p-12 text-center border border-slate-200/70 rounded-2xl">
            <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to load settings</h3>
            <p className="text-slate-600 mb-6">Unable to fetch system settings. Please try again.</p>
            <Button
              onClick={fetchSettings}
              variant="secondary"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#020617]">System Settings</h1>
            <p className="text-[#64748B] mt-1">Global configuration and platform controls</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Warning Banner */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm border-l-4 border-l-amber-500 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#64748B]">
              <span className="font-medium text-[#020617]">⚠️ Changes here affect all accounts and billing.</span> Proceed carefully.
            </p>
          </div>
        </Card>

        {/* SECTION 1: PLATFORM CONFIGURATION */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100">
              <Globe className="w-5 h-5 text-[#64748B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#020617]">Platform Configuration</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Platform Name</Label>
              <Input
                value={formData.platformName || ''}
                onChange={(e) => updateField('platformName', e.target.value)}
                className="border-[#E5E7EB] bg-white text-[#020617]"
                placeholder="SignalHub"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Default Currency</Label>
              <Select
                value={formData.defaultCurrency || 'KES'}
                onValueChange={(value) => updateField('defaultCurrency', value)}
              >
                <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Timezone</Label>
              <Select
                value={formData.timezone || 'Africa/Nairobi'}
                onValueChange={(value) => updateField('timezone', value)}
              >
                <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Date Format</Label>
              <Select
                value={formData.dateFormat || 'YYYY-MM-DD'}
                onValueChange={(value) => updateField('dateFormat', value)}
              >
                <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Environment</Label>
              <div className="flex items-center gap-3">
                <Select
                  value={formData.environment || 'production'}
                  onValueChange={(value: 'production' | 'sandbox') => updateField('environment', value)}
                >
                  <SelectTrigger className="!w-full !rounded-xl !border !border-slate-200 !bg-white !px-4 !py-3 !text-slate-900 !focus:outline-none !focus:ring-2 !focus:ring-emerald-500 !focus:ring-offset-0 !focus:border-emerald-500 !transition [&_svg]:!text-slate-400 [&_svg]:!absolute [&_svg]:!right-3 [&_svg]:!pointer-events-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
                <Badge
                  variant="outline"
                  className={
                    formData.environment === 'production'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }
                >
                  {formData.environment === 'production' ? 'Production' : 'Sandbox'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 2: SMS PROVIDER SETTINGS */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100">
              <Radio className="w-5 h-5 text-[#64748B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#020617]">SMS Provider Settings</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Provider Name</Label>
              <Input
                value={formData.providerName || ''}
                onChange={(e) => updateField('providerName', e.target.value)}
                className="border-[#E5E7EB] bg-white text-[#020617]"
                placeholder="HostPinnacle"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Provider API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.providerApiKey || ''}
                  onChange={(e) => updateField('providerApiKey', e.target.value)}
                  className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                  placeholder="Enter API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Default Provider Cost per Part (KES)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.defaultProviderCostPerPart || 0}
                onChange={(e) => updateField('defaultProviderCostPerPart', parseFloat(e.target.value))}
                className="border-[#E5E7EB] bg-white text-[#020617]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Retry Policy (0-3)</Label>
              <Input
                type="number"
                min="0"
                max="3"
                value={formData.retryPolicy || 0}
                onChange={(e) => updateField('retryPolicy', parseInt(e.target.value))}
                className="border-[#E5E7EB] bg-white text-[#020617]"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
                <div>
                  <Label className="text-sm font-medium text-[#020617]">Delivery Report Webhook Status</Label>
                  <p className="text-xs text-[#64748B] mt-1">Enable webhook notifications for delivery reports</p>
                </div>
                <Switch
                  checked={formData.deliveryReportWebhookEnabled || false}
                  onCheckedChange={(checked) => updateField('deliveryReportWebhookEnabled', checked)}
                  variant="default"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token')
                      const res = await fetch('/api/super-admin/dlr-webhook/register', {
                        method: 'POST',
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      })
                      const data = await res.json()
                      if (data.success) {
                        alert('DLR webhook registered with HostPinnacle. Delivery status will now be updated from their side.')
                      } else {
                        alert(data.error || 'Registration failed')
                      }
                    } catch (e: any) {
                      alert(e.message || 'Request failed')
                    }
                  }}
                  className="border-[#E5E7EB]"
                >
                  Register DLR URL with HostPinnacle
                </Button>
                <span className="text-xs text-[#64748B]">One-time: tell HostPinnacle to send delivery reports to this app</span>
              </div>
              <div className="mt-4 p-4 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA]">
                <Label className="text-sm font-medium text-[#020617] mb-2 block">Test delivery reports</Label>
                <p className="text-xs text-[#64748B] mb-3">Send a test SMS. Success and delivery status appear here—no need to open SMS History.</p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <Label className="text-xs text-[#64748B] mb-1 block">Phone number</Label>
                    <Input
                      placeholder="254712345678 or 0712345678"
                      value={dlrTestMobile}
                      onChange={(e) => {
                        setDlrTestMobile(e.target.value)
                        setDlrTestResult(null)
                        setDlrDeliveryStatus(null)
                      }}
                      className="w-48 border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#64748B] mb-1 block">Message (optional)</Label>
                    <Input
                      placeholder="DLR test from TXTLINK"
                      value={dlrTestMessage}
                      onChange={(e) => setDlrTestMessage(e.target.value)}
                      className="w-56 border-[#E5E7EB]"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!dlrTestMobile.trim() || dlrTestSending}
                    onClick={async () => {
                      setDlrTestSending(true)
                      setDlrTestResult(null)
                      setDlrDeliveryStatus(null)
                      try {
                        const token = localStorage.getItem('token')
                        const res = await fetch('/api/super-admin/dlr-webhook/send-test-sms', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            mobile: dlrTestMobile.trim(),
                            message: dlrTestMessage.trim() || undefined,
                          }),
                        })
                        const data = await res.json()
                        if (data.success) {
                          setDlrTestResult({ success: true, transactionId: data.transactionId || '' })
                          setDlrDeliveryStatus('sent')
                        } else {
                          setDlrTestResult({ success: false, error: data.error || 'Send failed' })
                        }
                      } catch (e: any) {
                        setDlrTestResult({ success: false, error: e.message || 'Request failed' })
                      } finally {
                        setDlrTestSending(false)
                      }
                    }}
                    className="bg-[#0F766E] hover:bg-[#115E59] text-white"
                  >
                    {dlrTestSending ? 'Sending…' : 'Send test SMS'}
                  </Button>
                </div>
                {dlrTestResult?.success && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-800">Test SMS sent successfully.</p>
                    <p className="text-xs text-emerald-700 mt-1">When HostPinnacle sends the DLR, status will update below.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={dlrCheckLoading}
                        onClick={async () => {
                          if (!dlrTestResult.success || !dlrTestResult.transactionId) return
                          setDlrCheckLoading(true)
                          try {
                            const token = localStorage.getItem('token')
                            const r = await fetch(
                              `/api/super-admin/dlr-webhook/test-status?transactionId=${encodeURIComponent(dlrTestResult.transactionId)}`,
                              { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                            )
                            const d = await r.json()
                            if (d.status === 'delivered' || d.status === 'failed' || d.status === 'sent' || d.status === 'queued') {
                              setDlrDeliveryStatus(d.status === 'queued' ? 'sent' : d.status)
                            }
                          } finally {
                            setDlrCheckLoading(false)
                          }
                        }}
                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                      >
                        {dlrCheckLoading ? 'Checking…' : 'Check delivery status'}
                      </Button>
                      {dlrDeliveryStatus && (
                        <span className={`text-sm font-medium ${dlrDeliveryStatus === 'delivered' ? 'text-emerald-700' : dlrDeliveryStatus === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>
                          {dlrDeliveryStatus === 'delivered' ? '✓ Delivered' : dlrDeliveryStatus === 'failed' ? '✗ Failed' : 'Sent (waiting for DLR)'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {dlrTestResult && !dlrTestResult.success && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-800">Test failed</p>
                    <p className="text-xs text-red-700 mt-1">{dlrTestResult.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 3: PRICING & COST CONTROLS */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100">
              <DollarSign className="w-5 h-5 text-[#64748B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#020617]">Pricing & Cost Controls</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Global Default Price per Part (KES)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.globalDefaultPricePerPart || 0}
                onChange={(e) => updateField('globalDefaultPricePerPart', parseFloat(e.target.value))}
                className="border-[#E5E7EB] bg-white text-[#020617]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Global Provider Cost per Part (KES)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.globalProviderCostPerPart || 0}
                onChange={(e) => updateField('globalProviderCostPerPart', parseFloat(e.target.value))}
                className="border-[#E5E7EB] bg-white text-[#020617]"
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
                <div>
                  <Label className="text-sm font-medium text-[#020617]">Default Charge on Failure</Label>
                  <p className="text-xs text-[#64748B] mt-1">Charge users for failed SMS by default</p>
                </div>
                <Switch
                  checked={formData.defaultChargeOnFailure || false}
                  onCheckedChange={(checked) => updateField('defaultChargeOnFailure', checked)}
                  variant="default"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
                <div>
                  <Label className="text-sm font-medium text-[#020617]">Default Refund on Failure</Label>
                  <p className="text-xs text-[#64748B] mt-1">Automatically refund failed SMS by default</p>
                </div>
                <Switch
                  checked={formData.defaultRefundOnFailure !== false}
                  onCheckedChange={(checked) => updateField('defaultRefundOnFailure', checked)}
                  variant="default"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 4: SECURITY & COMPLIANCE */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100">
              <Shield className="w-5 h-5 text-[#64748B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#020617]">Security & Compliance</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
              <div>
                <Label className="text-sm font-medium text-[#020617]">Require Sender ID Approval</Label>
                <p className="text-xs text-[#64748B] mt-1">All sender IDs must be approved before use</p>
              </div>
              <Switch
                checked={formData.requireSenderIdApproval !== false}
                onCheckedChange={(checked) => updateField('requireSenderIdApproval', checked)}
                variant="default"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
              <div>
                <Label className="text-sm font-medium text-[#020617]">Log All Admin Actions</Label>
                <p className="text-xs text-[#64748B] mt-1">Enable comprehensive audit logging</p>
              </div>
              <Switch
                checked={formData.logAllAdminActions !== false}
                onCheckedChange={(checked) => updateField('logAllAdminActions', checked)}
                variant="default"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
              <div>
                <Label className="text-sm font-medium text-[#020617]">Lock Pricing Edits to Super Admin Only</Label>
                <p className="text-xs text-[#64748B] mt-1">Only super admins can modify pricing rules</p>
              </div>
              <Switch
                checked={formData.lockPricingEditsToSuperAdmin !== false}
                onCheckedChange={(checked) => updateField('lockPricingEditsToSuperAdmin', checked)}
                variant="default"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
              <div>
                <Label className="text-sm font-medium text-[#020617]">Enable IP Logging</Label>
                <p className="text-xs text-[#64748B] mt-1">Log IP addresses for all actions</p>
              </div>
              <Switch
                checked={formData.enableIpLogging !== false}
                onCheckedChange={(checked) => updateField('enableIpLogging', checked)}
                variant="default"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 5: SYSTEM DEFAULTS */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100">
              <Database className="w-5 h-5 text-[#64748B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#020617]">System Defaults</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Default SMS Encoding</Label>
              <Select
                value={formData.defaultSmsEncoding || 'auto'}
                onValueChange={(value: 'auto' | 'gsm7' | 'ucs2') => updateField('defaultSmsEncoding', value)}
              >
                <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="gsm7">GSM-7</SelectItem>
                  <SelectItem value="ucs2">UCS-2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Default Sender ID Behavior</Label>
              <Select
                value={formData.defaultSenderIdBehavior || 'require_approval'}
                onValueChange={(value) => updateField('defaultSenderIdBehavior', value)}
              >
                <SelectTrigger className="border-[#E5E7EB] bg-white text-[#020617]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="require_approval">Require Approval</SelectItem>
                  <SelectItem value="auto_approve">Auto Approve</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-2 block">Default Account Credit Limit (KES)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.defaultAccountCreditLimit || 0}
                onChange={(e) => updateField('defaultAccountCreditLimit', parseFloat(e.target.value))}
                className="border-[#E5E7EB] bg-white text-[#020617]"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 6: M-PESA CONFIGURATION */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-slate-100">
              <Key className="w-5 h-5 text-[#64748B]" />
            </div>
            <h2 className="text-xl font-semibold text-[#020617]">M-Pesa Gateway Configuration</h2>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg border border-[#E5E7EB]">
              <div>
                <Label className="text-sm font-medium text-[#020617]">Enable M-Pesa Gateway</Label>
                <p className="text-xs text-[#64748B] mt-1">Enable M-Pesa STK Push and C2B payment processing</p>
              </div>
              <Switch
                checked={formData.mpesaEnabled || false}
                onCheckedChange={(checked) => updateField('mpesaEnabled', checked)}
                variant="default"
              />
            </div>
          </div>

          {formData.mpesaEnabled && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-[#020617] mb-2 block">Consumer Key</Label>
                  <div className="relative">
                    <Input
                      type={showMpesaCredentials.consumerKey ? 'text' : 'password'}
                      value={formData.mpesaConsumerKey || ''}
                      onChange={(e) => updateField('mpesaConsumerKey', e.target.value)}
                      className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                      placeholder="e.g., your_consumer_key_from_mpesa_portal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMpesaCredentials({ ...showMpesaCredentials, consumerKey: !showMpesaCredentials.consumerKey })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                    >
                      {showMpesaCredentials.consumerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#020617] mb-2 block">Consumer Secret</Label>
                  <div className="relative">
                    <Input
                      type={showMpesaCredentials.consumerSecret ? 'text' : 'password'}
                      value={formData.mpesaConsumerSecret || ''}
                      onChange={(e) => updateField('mpesaConsumerSecret', e.target.value)}
                      className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                      placeholder="e.g., your_consumer_secret_from_mpesa_portal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMpesaCredentials({ ...showMpesaCredentials, consumerSecret: !showMpesaCredentials.consumerSecret })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                    >
                      {showMpesaCredentials.consumerSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#020617] mb-2 block">Passkey</Label>
                  <div className="relative">
                    <Input
                      type={showMpesaCredentials.passkey ? 'text' : 'password'}
                      value={formData.mpesaPasskey || ''}
                      onChange={(e) => updateField('mpesaPasskey', e.target.value)}
                      className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                      placeholder="e.g., your_passkey_from_mpesa_portal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMpesaCredentials({ ...showMpesaCredentials, passkey: !showMpesaCredentials.passkey })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                    >
                      {showMpesaCredentials.passkey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#020617] mb-2 block">Shortcode (Paybill/Till Number)</Label>
                  <Input
                    value={formData.mpesaShortcode || ''}
                    onChange={(e) => updateField('mpesaShortcode', e.target.value)}
                    className="border-[#E5E7EB] bg-white text-[#020617]"
                    placeholder="e.g., 174379 or your paybill/till number"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#020617] mb-2 block">Environment</Label>
                  <Select
                    value={formData.mpesaEnvironment || 'sandbox'}
                    onValueChange={(value: 'sandbox' | 'production') => updateField('mpesaEnvironment', value)}
                  >
                    <SelectTrigger className="!w-full !rounded-xl !border !border-slate-200 !bg-white !px-4 !py-3 !text-slate-900 !focus:outline-none !focus:ring-2 !focus:ring-emerald-500 !focus:ring-offset-0 !focus:border-emerald-500 !transition [&_svg]:!text-slate-400 [&_svg]:!absolute [&_svg]:!right-3 [&_svg]:!pointer-events-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#020617]">Callback URLs</h3>
                <div className="grid md:grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-[#020617] mb-2 block">STK Push Callback URL</Label>
                    <Input
                      value={formData.mpesaCallbackUrl || ''}
                      onChange={(e) => updateField('mpesaCallbackUrl', e.target.value)}
                      className="border-[#E5E7EB] bg-white text-[#020617]"
                      placeholder="https://yourdomain.com/api/mpesa/stk-callback"
                    />
                    <p className="text-xs text-[#64748B] mt-1">URL where M-Pesa sends STK Push payment callbacks</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#020617] mb-2 block">C2B Validation URL</Label>
                    <Input
                      value={formData.mpesaValidationUrl || ''}
                      onChange={(e) => updateField('mpesaValidationUrl', e.target.value)}
                      className="border-[#E5E7EB] bg-white text-[#020617]"
                      placeholder="https://yourdomain.com/api/c2b-validation"
                    />
                    <p className="text-xs text-[#64748B] mt-1">URL where M-Pesa sends C2B validation requests</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#020617] mb-2 block">C2B Confirmation URL</Label>
                    <Input
                      value={formData.mpesaConfirmationUrl || ''}
                      onChange={(e) => updateField('mpesaConfirmationUrl', e.target.value)}
                      className="border-[#E5E7EB] bg-white text-[#020617]"
                      placeholder="https://yourdomain.com/api/c2b-confirmation"
                    />
                    <p className="text-xs text-[#64748B] mt-1">URL where M-Pesa sends C2B confirmation requests</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 mb-3">
                    <strong>Note:</strong> After configuring M-Pesa settings, register the C2B URLs with M-Pesa.
                  </p>
                  <Button
                    onClick={handleRegisterC2BUrls}
                    disabled={registeringUrls || !formData.mpesaValidationUrl || !formData.mpesaConfirmationUrl}
                    variant="secondary"
                  >
                    {registeringUrls ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Register C2B URLs
                      </>
                    )}
                  </Button>
                </div>

                {formData.mpesaEnvironment === 'sandbox' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-900 mb-3">Test C2B Payment (Sandbox Only)</p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-[#020617] mb-1 block">Phone Number</Label>
                        <Input
                          value={simulationData.phoneNumber}
                          onChange={(e) => setSimulationData({ ...simulationData, phoneNumber: e.target.value })}
                          placeholder="254712345678"
                          className="border-[#E5E7EB] bg-white text-[#020617]"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#020617] mb-1 block">Amount (KES)</Label>
                        <Input
                          type="number"
                          value={simulationData.amount}
                          onChange={(e) => setSimulationData({ ...simulationData, amount: e.target.value })}
                          placeholder="100"
                          className="border-[#E5E7EB] bg-white text-[#020617]"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#020617] mb-1 block">Bill Reference (Optional)</Label>
                        <Input
                          value={simulationData.billRefNumber}
                          onChange={(e) => setSimulationData({ ...simulationData, billRefNumber: e.target.value })}
                          placeholder="Account reference"
                          className="border-[#E5E7EB] bg-white text-[#020617]"
                        />
                      </div>
                      <Button
                        onClick={handleSimulateC2B}
                        disabled={simulating || !simulationData.phoneNumber || !simulationData.amount}
                        variant="secondary"
                        className="w-full"
                      >
                        {simulating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Simulating...
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4" />
                            Simulate C2B Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* SECTION 6.5: HOSTPINNACLE CONFIGURATION */}
        <Card className="bg-white border-[#E5E7EB] rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-semibold text-[#020617]">HostPinnacle SMS Gateway Configuration</h2>
            </div>
            <p className="text-sm text-[#64748B]">Configure HostPinnacle API credentials and connection settings</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-[#020617] mb-2 block">Base URL</Label>
                <Input
                  value={formData.hostpinnacleBaseUrl || settings?.hostpinnacleBaseUrl || 'https://smsportal.hostpinnacle.co.ke'}
                  onChange={(e) => setFormData({ ...formData, hostpinnacleBaseUrl: e.target.value })}
                  placeholder="https://smsportal.hostpinnacle.co.ke"
                  className="border-[#E5E7EB] bg-white text-[#020617]"
                />
                <p className="text-xs text-[#64748B] mt-1">HostPinnacle API base URL</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-[#020617] mb-2 block">Status Endpoint</Label>
                <Input
                  value={formData.hostpinnacleStatusEndpoint || settings?.hostpinnacleStatusEndpoint || '/SMSApi/report/status'}
                  onChange={(e) => setFormData({ ...formData, hostpinnacleStatusEndpoint: e.target.value })}
                  placeholder="/SMSApi/report/status"
                  className="border-[#E5E7EB] bg-white text-[#020617]"
                />
                <p className="text-xs text-[#64748B] mt-1">Endpoint path for SMS status checks</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-3 block">Authentication</Label>
              <p className="text-xs text-[#64748B] mb-4">Use either API Key (recommended) or User ID + Password</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-[#020617] mb-2 block">API Key (Recommended)</Label>
                  <div className="relative">
                    <Input
                      type={showHostPinnacleCredentials.apiKey ? 'text' : 'password'}
                      value={formData.hostpinnacleApiKey || settings?.hostpinnacleApiKey || ''}
                      onChange={(e) => setFormData({ ...formData, hostpinnacleApiKey: e.target.value })}
                      placeholder="Enter API key"
                      className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                      onClick={() => setShowHostPinnacleCredentials({ ...showHostPinnacleCredentials, apiKey: !showHostPinnacleCredentials.apiKey })}
                    >
                      {showHostPinnacleCredentials.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">API key for authentication (preferred method)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-[#020617] mb-2 block">User ID</Label>
                    <div className="relative">
                      <Input
                        type={showHostPinnacleCredentials.userId ? 'text' : 'password'}
                        value={formData.hostpinnacleUserId || settings?.hostpinnacleUserId || ''}
                        onChange={(e) => setFormData({ ...formData, hostpinnacleUserId: e.target.value })}
                        placeholder="Enter user ID"
                        className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                        onClick={() => setShowHostPinnacleCredentials({ ...showHostPinnacleCredentials, userId: !showHostPinnacleCredentials.userId })}
                      >
                        {showHostPinnacleCredentials.userId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#020617] mb-2 block">Password</Label>
                    <div className="relative">
                      <Input
                        type={showHostPinnacleCredentials.password ? 'text' : 'password'}
                        value={formData.hostpinnaclePassword || settings?.hostpinnaclePassword || ''}
                        onChange={(e) => setFormData({ ...formData, hostpinnaclePassword: e.target.value })}
                        placeholder="Enter password"
                        className="border-[#E5E7EB] bg-white text-[#020617] pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#020617]"
                        onClick={() => setShowHostPinnacleCredentials({ ...showHostPinnacleCredentials, password: !showHostPinnacleCredentials.password })}
                      >
                        {showHostPinnacleCredentials.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#64748B]">Alternative: Use User ID + Password if API key is not available</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium text-[#020617] mb-3 block">Timeout Settings (milliseconds)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-[#64748B] mb-1 block">Default Timeout</Label>
                  <Input
                    type="number"
                    value={formData.hostpinnacleTimeout || settings?.hostpinnacleTimeout || 30000}
                    onChange={(e) => setFormData({ ...formData, hostpinnacleTimeout: parseInt(e.target.value) || 30000 })}
                    className="border-[#E5E7EB] bg-white text-[#020617]"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Default: 30000ms (30s)</p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-[#64748B] mb-1 block">SMS Send Timeout</Label>
                  <Input
                    type="number"
                    value={formData.hostpinnacleSmsSendTimeout || settings?.hostpinnacleSmsSendTimeout || 45000}
                    onChange={(e) => setFormData({ ...formData, hostpinnacleSmsSendTimeout: parseInt(e.target.value) || 45000 })}
                    className="border-[#E5E7EB] bg-white text-[#020617]"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Default: 45000ms (45s)</p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-[#64748B] mb-1 block">Status Check Timeout</Label>
                  <Input
                    type="number"
                    value={formData.hostpinnacleStatusTimeout || settings?.hostpinnacleStatusTimeout || 15000}
                    onChange={(e) => setFormData({ ...formData, hostpinnacleStatusTimeout: parseInt(e.target.value) || 15000 })}
                    className="border-[#E5E7EB] bg-white text-[#020617]"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Default: 15000ms (15s)</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> These settings override environment variables. If not set here, the system will use values from <code className="bg-blue-100 px-1 rounded">.env.local</code> file.
              </p>
            </div>
          </div>
        </Card>

        {/* SECTION 7: DANGER ZONE */}
        <Card className="bg-white border border-red-200 rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-red-700 mb-1">Danger Zone</h2>
            <p className="text-sm text-slate-600">Irreversible actions that affect the entire platform</p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-slate-900">Rotate Provider API Keys</Label>
                  <p className="text-xs text-slate-600 mt-1">Generate new API keys for the provider</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDangerAction('rotate_api_keys')}
                >
                  <Key className="w-4 h-4" />
                  Rotate Keys
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-slate-900">Flush Webhook Logs</Label>
                  <p className="text-xs text-slate-600 mt-1">Permanently delete all webhook log entries</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDangerAction('flush_webhook_logs')}
                >
                  <Trash2 className="w-4 h-4" />
                  Flush Logs
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-slate-900">Recalculate Balances</Label>
                  <p className="text-xs text-slate-600 mt-1">Recalculate all account balances (dangerous)</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDangerAction('recalculate_balances')}
                >
                  <RotateCcw className="w-4 h-4" />
                  Recalculate
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-slate-900">Disable SMS Sending Globally</Label>
                  <p className="text-xs text-slate-600 mt-1">Stop all SMS sending across the platform</p>
                </div>
                <Switch
                  checked={!formData.smsSendingEnabled}
                  onCheckedChange={(checked) => updateField('smsSendingEnabled', !checked)}
                  variant="danger"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Danger Action Confirmation Dialog */}
        <AlertDialog open={!!dangerAction} onOpenChange={(open) => !open && setDangerAction(null)}>
          <AlertDialogContent className="bg-white border-red-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">Confirm Dangerous Action</AlertDialogTitle>
              <AlertDialogDescription>
                {dangerAction === 'rotate_api_keys' && 'This will rotate the provider API keys. All active connections may be interrupted.'}
                {dangerAction === 'flush_webhook_logs' && 'This will permanently delete all webhook logs. This action cannot be undone.'}
                {dangerAction === 'recalculate_balances' && 'This will recalculate all account balances. This may take several minutes and could affect active transactions.'}
                Are you absolutely sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => dangerAction && handleDangerAction(dangerAction)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}


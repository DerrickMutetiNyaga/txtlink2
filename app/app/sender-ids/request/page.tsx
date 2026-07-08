'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PortalLayout } from '@/components/portal-layout'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  INDUSTRIES,
  SMS_USE_CASES,
  normalizeDesiredSenderId,
  validateDesiredSenderId,
  validateEmail,
  validatePhone,
} from '@/lib/validation/sender-id-request'
import { ArrowLeft, Loader2 } from 'lucide-react'

const fieldClass =
  'w-full h-11 min-h-[44px] px-4 border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]'

const textareaClass =
  'w-full min-h-[110px] px-4 py-3 border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73] resize-y'

const selectClass =
  'w-full h-11 min-h-[44px] px-4 border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73]'

const labelClass = 'block text-sm font-medium text-[#0F172A] mb-1.5'

const helperClass = 'text-xs text-[#64748B] mt-1'

const errorClass = 'text-xs text-[#EF4444] mt-1'

const cardClass =
  'rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-6 shadow-sm w-full max-w-full min-w-0'

const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[46px] h-11 px-5 rounded-xl border-0 bg-[#2F9B73] text-white font-medium hover:bg-[#267D5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 w-full sm:w-auto'

const secondaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[46px] h-11 px-5 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-medium hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 w-full sm:w-auto'

interface FormState {
  desiredSenderId: string
  businessName: string
  businessRegistrationNumber: string
  kraPin: string
  contactPerson: string
  phoneNumber: string
  email: string
  smsUseCase: string
  sampleSmsMessage: string
  industry: string
}

const emptyForm: FormState = {
  desiredSenderId: '',
  businessName: '',
  businessRegistrationNumber: '',
  kraPin: '',
  contactPerson: '',
  phoneNumber: '',
  email: '',
  smsUseCase: '',
  sampleSmsMessage: '',
  industry: '',
}

export default function SenderIdRequestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [draftId, setDraftId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const senderPreview = useMemo(
    () => normalizeDesiredSenderId(form.desiredSenderId),
    [form.desiredSenderId]
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')

        const [profileRes, requestsRes] = await Promise.all([
          fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/user/sender-ids/requests', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        let nextForm = { ...emptyForm }

        if (profileRes.ok) {
          const profileData = await profileRes.json()
          nextForm = {
            ...nextForm,
            contactPerson: profileData.user?.name || '',
            phoneNumber: profileData.user?.phone || '',
            email: profileData.user?.email || '',
          }
        }

        if (requestsRes.ok) {
          const requestsData = await requestsRes.json()
          const requests = requestsData.requests || []
          const editable =
            requests.find((r: { status: string }) => r.status === 'draft') ||
            requests.find((r: { status: string }) => r.status === 'rejected')

          if (editable) {
            setDraftId(editable.id)
            nextForm = {
              desiredSenderId: editable.desiredSenderId || '',
              businessName: editable.businessName || '',
              businessRegistrationNumber: editable.businessRegistrationNumber || '',
              kraPin: editable.kraPin || '',
              contactPerson: editable.contactPerson || nextForm.contactPerson,
              phoneNumber: editable.phoneNumber || nextForm.phoneNumber,
              email: editable.email || nextForm.email,
              smsUseCase: editable.smsUseCase || '',
              sampleSmsMessage: editable.sampleSmsMessage || '',
              industry: editable.industry || '',
            }
          }
        }

        setForm(nextForm)
      } catch (error) {
        console.error('Failed to load sender ID application:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validateForSubmit = () => {
    const nextErrors: Record<string, string> = {}

    const senderError = validateDesiredSenderId(form.desiredSenderId)
    if (senderError) nextErrors.desiredSenderId = senderError
    if (!form.businessName.trim()) nextErrors.businessName = 'Business / brand name is required'
    if (!form.contactPerson.trim()) nextErrors.contactPerson = 'Contact person is required'

    const phoneError = validatePhone(form.phoneNumber)
    if (phoneError) nextErrors.phoneNumber = phoneError

    const emailError = validateEmail(form.email)
    if (emailError) nextErrors.email = emailError

    if (!form.smsUseCase) nextErrors.smsUseCase = 'SMS use case is required'
    if (!form.sampleSmsMessage.trim()) nextErrors.sampleSmsMessage = 'Sample SMS message is required'
    if (!form.industry) nextErrors.industry = 'Industry is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const saveRequest = async (status: 'draft' | 'submitted') => {
    const token = localStorage.getItem('token')
    const payload = {
      ...form,
      desiredSenderId: senderPreview,
      status,
    }

    const url = draftId
      ? `/api/user/sender-ids/requests/${draftId}`
      : '/api/user/sender-ids/requests'
    const method = draftId ? 'PATCH' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      if (data.errors) setErrors(data.errors)
      throw new Error(data.error || 'Failed to save application')
    }

    if (data.request?.id) setDraftId(data.request.id)
    return data.message as string
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      const message = await saveRequest('draft')
      toast({ title: 'Draft saved', description: message })
    } catch (error: any) {
      toast({
        title: 'Could not save draft',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForSubmit()) return

    try {
      setSubmitting(true)
      const message = await saveRequest('submitted')
      toast({
        title: 'Application submitted',
        description: message,
      })
      router.push('/app/sender-ids')
    } catch (error: any) {
      toast({
        title: 'Submission failed',
        description: error.message || 'Please check the form and try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PortalLayout activeSection="Sender IDs">
        <div className="flex items-center justify-center py-20 text-[#64748B]">
          <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#2F9B73]" />
          Loading application form...
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout activeSection="Sender IDs">
      <div className="space-y-4 md:space-y-6 w-full max-w-4xl mx-auto min-w-0">
        <div className="min-w-0">
          <Link
            href="/app/sender-ids"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2F9B73] hover:text-[#267D5E] mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sender IDs
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A]">Sender ID Application</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Apply for a branded sender name for your business SMS messages.
          </p>
          <p className="text-xs text-[#64748B] mt-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 inline-block">
            Sender names are reviewed before activation.
          </p>
        </div>

        <Card className={cardClass}>
          <h2 className="text-base font-semibold text-[#0F172A] mb-5">Application Details</h2>

          <form onSubmit={handleSubmit} className="space-y-5 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="desiredSenderId" className={labelClass}>
                  Desired Sender ID <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="desiredSenderId"
                  value={form.desiredSenderId}
                  onChange={(e) => updateField('desiredSenderId', e.target.value.toUpperCase())}
                  placeholder="e.g. TXTLINK"
                  maxLength={11}
                  className={cn(fieldClass, errors.desiredSenderId && 'border-[#EF4444]')}
                />
                <p className={helperClass}>Sender ID must not exceed 11 characters.</p>
                {senderPreview && (
                  <p className="text-xs text-[#047857] mt-1">
                    Preview: <span className="font-semibold">{senderPreview}</span>
                  </p>
                )}
                {errors.desiredSenderId && <p className={errorClass}>{errors.desiredSenderId}</p>}
              </div>

              <div className="min-w-0">
                <label htmlFor="businessName" className={labelClass}>
                  Business / Brand Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="e.g. TXTLINK Ltd"
                  className={cn(fieldClass, errors.businessName && 'border-[#EF4444]')}
                />
                {errors.businessName && <p className={errorClass}>{errors.businessName}</p>}
              </div>

              <div className="min-w-0">
                <label htmlFor="businessRegistrationNumber" className={labelClass}>
                  Business Registration Number
                </label>
                <input
                  id="businessRegistrationNumber"
                  value={form.businessRegistrationNumber}
                  onChange={(e) => updateField('businessRegistrationNumber', e.target.value)}
                  placeholder="e.g. BN/2024/123456"
                  className={fieldClass}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="kraPin" className={labelClass}>
                  KRA PIN / Tax Number
                </label>
                <input
                  id="kraPin"
                  value={form.kraPin}
                  onChange={(e) => updateField('kraPin', e.target.value)}
                  placeholder="e.g. P000000000A"
                  className={fieldClass}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="contactPerson" className={labelClass}>
                  Contact Person <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="contactPerson"
                  value={form.contactPerson}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                  placeholder="e.g. John Doe"
                  className={cn(fieldClass, errors.contactPerson && 'border-[#EF4444]')}
                />
                {errors.contactPerson && <p className={errorClass}>{errors.contactPerson}</p>}
              </div>

              <div className="min-w-0">
                <label htmlFor="phoneNumber" className={labelClass}>
                  Phone Number <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  placeholder="e.g. +254712345678"
                  className={cn(fieldClass, errors.phoneNumber && 'border-[#EF4444]')}
                />
                {errors.phoneNumber && <p className={errorClass}>{errors.phoneNumber}</p>}
              </div>

              <div className="min-w-0">
                <label htmlFor="email" className={labelClass}>
                  Email <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="e.g. name@business.com"
                  className={cn(fieldClass, errors.email && 'border-[#EF4444]')}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>

              <div className="min-w-0">
                <label htmlFor="industry" className={labelClass}>
                  Industry <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  id="industry"
                  value={form.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  className={cn(selectClass, errors.industry && 'border-[#EF4444]')}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.industry && <p className={errorClass}>{errors.industry}</p>}
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="smsUseCase" className={labelClass}>
                SMS Use Case <span className="text-[#EF4444]">*</span>
              </label>
              <select
                id="smsUseCase"
                value={form.smsUseCase}
                onChange={(e) => updateField('smsUseCase', e.target.value)}
                className={cn(selectClass, errors.smsUseCase && 'border-[#EF4444]')}
              >
                <option value="">Select use case</option>
                {SMS_USE_CASES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.smsUseCase && <p className={errorClass}>{errors.smsUseCase}</p>}
            </div>

            <div className="min-w-0">
              <label htmlFor="sampleSmsMessage" className={labelClass}>
                Sample SMS Message <span className="text-[#EF4444]">*</span>
              </label>
              <textarea
                id="sampleSmsMessage"
                value={form.sampleSmsMessage}
                onChange={(e) => updateField('sampleSmsMessage', e.target.value)}
                placeholder="e.g. Dear customer, your order has been confirmed."
                className={cn(textareaClass, errors.sampleSmsMessage && 'border-[#EF4444]')}
              />
              {errors.sampleSmsMessage && <p className={errorClass}>{errors.sampleSmsMessage}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
              <Link
                href="/app/sender-ids"
                className="text-sm font-medium text-[#64748B] hover:text-[#2F9B73] text-center sm:text-left"
              >
                Back to Sender IDs
              </Link>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || submitting}
                  className={secondaryBtnClass}
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button type="submit" disabled={submitting || saving} className={primaryBtnClass}>
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </PortalLayout>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
import { ArrowLeft, FileUp, Loader2, X } from 'lucide-react'

const fieldClass =
  'w-full h-11 min-h-[44px] px-4 border border-[#E2E8F0] rounded-xl bg-white text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]'

const textareaClass =
  'w-full min-h-[110px] px-4 py-3 border border-[#E2E8F0] rounded-xl bg-white text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73] resize-y'

const selectClass =
  'w-full h-11 min-h-[44px] px-4 border border-[#E2E8F0] rounded-xl bg-white text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F9B73]/15 focus:border-[#2F9B73]'

const labelClass = 'block text-sm font-medium text-[#0F172A] mb-1.5'
const helperClass = 'text-xs text-[#64748B] mt-1'
const errorClass = 'text-xs text-[#EF4444] mt-1'
const cardClass =
  'rounded-[18px] border border-[#E2E8F0] bg-white p-4 sm:p-6 shadow-sm w-full max-w-full min-w-0'
const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[46px] h-11 px-5 rounded-xl border-0 bg-[#2F9B73] text-white font-medium hover:bg-[#267D5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 w-full sm:w-auto'
const secondaryBtnClass =
  'inline-flex items-center justify-center gap-2 min-h-[46px] h-11 px-5 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] font-medium hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9B73]/15 disabled:opacity-50 w-full sm:w-auto'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

interface FormState {
  desiredSenderId: string
  contactPerson: string
  phoneNumber: string
  email: string
  smsUseCase: string
  sampleSmsMessage: string
  industry: string
}

interface CertificateState {
  url: string
  secureUrl: string
  publicId: string
  fileName: string
  mimeType: string
  size: number
}

interface PendingPaymentState {
  invoiceId: string
  feeAmount: number
  desiredSenderId: string
}

const emptyForm: FormState = {
  desiredSenderId: '',
  contactPerson: '',
  phoneNumber: '',
  email: '',
  smsUseCase: '',
  sampleSmsMessage: '',
  industry: '',
}

function validateCertificateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return 'Business certificate must be 5MB or smaller'
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png']
  if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(extension)) {
    return 'Only PDF, JPG, JPEG, and PNG files are allowed'
  }
  return null
}

export default function SenderIdRequestPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [certificate, setCertificate] = useState<CertificateState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [draftId, setDraftId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<PendingPaymentState | null>(null)

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

          const awaitingPayment = requests.find(
            (r: { status: string }) => r.status === 'payment_pending'
          )
          if (awaitingPayment?.invoiceId) {
            setPendingPayment({
              invoiceId: awaitingPayment.invoiceId,
              feeAmount: 0,
              desiredSenderId: awaitingPayment.desiredSenderId || '',
            })

            const invoiceRes = await fetch(
              `/api/user/billing/invoices/${awaitingPayment.invoiceId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (invoiceRes.ok) {
              const invoiceData = await invoiceRes.json()
              setPendingPayment({
                invoiceId: awaitingPayment.invoiceId,
                feeAmount: invoiceData.invoice?.amount || 0,
                desiredSenderId: awaitingPayment.desiredSenderId || '',
              })
            }
          }

          const editable =
            requests.find((r: { status: string }) => r.status === 'draft') ||
            requests.find((r: { status: string }) => r.status === 'rejected')

          if (editable && !awaitingPayment) {
            setDraftId(editable.id)
            nextForm = {
              desiredSenderId: editable.desiredSenderId || '',
              contactPerson: editable.contactPerson || nextForm.contactPerson,
              phoneNumber: editable.phoneNumber || nextForm.phoneNumber,
              email: editable.email || nextForm.email,
              smsUseCase: editable.smsUseCase || '',
              sampleSmsMessage: editable.sampleSmsMessage || '',
              industry: editable.industry || '',
            }

            if (editable.businessCertificateSecureUrl || editable.businessCertificateUrl) {
              setCertificate({
                url: editable.businessCertificateUrl || '',
                secureUrl: editable.businessCertificateSecureUrl || '',
                publicId: editable.businessCertificatePublicId || '',
                fileName: editable.businessCertificateFileName || 'certificate',
                mimeType: editable.businessCertificateMimeType || '',
                size: editable.businessCertificateSize || 0,
              })
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

  const handleCertificateSelect = async (file: File | null) => {
    if (!file) return

    const fileError = validateCertificateFile(file)
    if (fileError) {
      setErrors((prev) => ({ ...prev, businessCertificate: fileError }))
      return
    }

    try {
      setUploading(true)
      setErrors((prev) => {
        const next = { ...prev }
        delete next.businessCertificate
        return next
      })

      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/uploads/cloudinary', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload certificate')
      }

      setCertificate({
        url: data.url,
        secureUrl: data.secureUrl,
        publicId: data.publicId,
        fileName: data.originalFilename || file.name,
        mimeType: file.type,
        size: data.bytes || file.size,
      })

      toast({
        title: 'Certificate uploaded',
        description: 'Your business certificate was uploaded successfully.',
      })
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        businessCertificate: error.message || 'Failed to upload certificate',
      }))
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const buildPayload = (status: 'draft' | 'submitted') => ({
    ...form,
    desiredSenderId: senderPreview,
    status,
    businessCertificateUrl: certificate?.url || '',
    businessCertificateSecureUrl: certificate?.secureUrl || '',
    businessCertificatePublicId: certificate?.publicId || '',
    businessCertificateFileName: certificate?.fileName || '',
    businessCertificateMimeType: certificate?.mimeType || '',
    businessCertificateSize: certificate?.size || 0,
  })

  const validateForSubmit = () => {
    const nextErrors: Record<string, string> = {}

    const senderError = validateDesiredSenderId(form.desiredSenderId)
    if (senderError) nextErrors.desiredSenderId = senderError
    if (!certificate?.secureUrl && !certificate?.url) {
      nextErrors.businessCertificate = 'Business certificate is required'
    }
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
    const payload = buildPayload(status)

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
      if (response.status === 409 && data.existingInvoiceId) {
        setPendingPayment({
          invoiceId: data.existingInvoiceId,
          feeAmount: 0,
          desiredSenderId: senderPreview,
        })
      }
      throw new Error(data.error || 'Failed to save application')
    }

    if (status === 'submitted' && data.invoice?.id) {
      setPendingPayment({
        invoiceId: data.invoice.id,
        feeAmount: data.feeAmount || data.invoice.amount,
        desiredSenderId: data.request?.desiredSenderId || senderPreview,
      })
      return data.message as string
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
      await saveRequest('submitted')
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

  if (pendingPayment) {
    return (
      <PortalLayout activeSection="Sender IDs">
        <div className="space-y-4 md:space-y-6 w-full max-w-2xl mx-auto min-w-0">
          <div className="min-w-0">
            <Link
              href="/app/sender-ids"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2F9B73] hover:text-[#267D5E] mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sender IDs
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A]">
              Sender ID application created
            </h1>
          </div>

          <Card className={cn(cardClass, 'bg-[#ECFDF5] border-[#2F9B73]/20')}>
            <div className="space-y-4">
              <p className="text-sm text-[#0F172A]">
                Your application for{' '}
                <span className="font-semibold">{pendingPayment.desiredSenderId}</span> has been
                saved. Payment is required before review can begin.
              </p>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                <p className="text-sm font-medium text-[#64748B]">Payment required</p>
                <p className="text-2xl font-semibold text-[#0F172A] mt-1">
                  KSh {pendingPayment.feeAmount.toLocaleString()}
                </p>
                <p className="text-xs text-[#64748B] mt-2">
                  Your application will enter review after payment is confirmed.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/app/billing/top-up?invoiceId=${pendingPayment.invoiceId}`}
                  className={primaryBtnClass}
                >
                  Pay Now
                </Link>
                <Link href="/app/billing" className={secondaryBtnClass}>
                  Go to Billing
                </Link>
              </div>
            </div>
          </Card>
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
            Review begins after application fee payment is confirmed.
          </p>
        </div>

        <Card className={cardClass}>
          <h2 className="text-base font-semibold text-[#0F172A] mb-5">Application Details</h2>

          <form onSubmit={handleSubmit} className="space-y-5 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="min-w-0 md:col-span-2">
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
                <p className={helperClass}>Letters and numbers only, max 11 characters.</p>
                {senderPreview && (
                  <p className="text-xs text-[#2F9B73] mt-1">
                    Preview: <span className="font-semibold">{senderPreview}</span>
                  </p>
                )}
                {errors.desiredSenderId && <p className={errorClass}>{errors.desiredSenderId}</p>}
              </div>

              <div className="min-w-0 md:col-span-2">
                <label className={labelClass}>
                  Attach Business Certificate <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handleCertificateSelect(e.target.files?.[0] || null)}
                />
                <div
                  className={cn(
                    'rounded-xl border-2 border-dashed p-4 sm:p-6 text-center transition-colors',
                    errors.businessCertificate
                      ? 'border-[#EF4444] bg-red-50/30'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#2F9B73]/40'
                  )}
                >
                  {certificate ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#2F9B73] shrink-0">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">
                            {certificate.fileName}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {(certificate.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className={secondaryBtnClass}
                        >
                          Replace file
                        </button>
                        <button
                          type="button"
                          onClick={() => setCertificate(null)}
                          disabled={uploading}
                          className="inline-flex items-center justify-center gap-2 min-h-[46px] h-11 px-5 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] font-medium hover:bg-[#F8FAFC] w-full sm:w-auto"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex flex-col items-center gap-2 py-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-[#2F9B73]" />
                          <span className="text-sm text-[#64748B]">Uploading certificate...</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-8 h-8 text-[#2F9B73]" />
                          <span className="text-sm font-medium text-[#0F172A]">
                            Click to upload business certificate
                          </span>
                          <span className="text-xs text-[#64748B]">
                            PDF, JPG, JPEG, or PNG — max 5MB
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {errors.businessCertificate && (
                  <p className={errorClass}>{errors.businessCertificate}</p>
                )}
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
                  disabled={saving || submitting || uploading}
                  className={secondaryBtnClass}
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || saving || uploading}
                  className={primaryBtnClass}
                >
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

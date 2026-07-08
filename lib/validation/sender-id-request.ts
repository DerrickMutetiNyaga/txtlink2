export const SMS_USE_CASES = [
  'Marketing',
  'Transactional',
  'Notifications',
  'OTP / Verification',
  'Customer Support',
  'Other',
] as const

export const INDUSTRIES = [
  'Retail',
  'Finance',
  'Education',
  'Healthcare',
  'Transport',
  'Hospitality',
  'Technology',
  'Church / NGO',
  'Other',
] as const

export type SmsUseCase = (typeof SMS_USE_CASES)[number]
export type Industry = (typeof INDUSTRIES)[number]

export interface BusinessCertificatePayload {
  businessCertificateUrl?: string
  businessCertificateSecureUrl?: string
  businessCertificatePublicId?: string
  businessCertificateFileName?: string
  businessCertificateMimeType?: string
  businessCertificateSize?: number
}

export interface SenderIdRequestPayload extends BusinessCertificatePayload {
  desiredSenderId?: string
  contactPerson?: string
  phoneNumber?: string
  email?: string
  smsUseCase?: string
  sampleSmsMessage?: string
  industry?: string
  status?: 'draft' | 'submitted'
}

export function normalizeDesiredSenderId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function validateDesiredSenderId(value: string): string | null {
  const normalized = normalizeDesiredSenderId(value)
  if (!normalized) return 'Desired Sender ID is required'
  if (normalized.length > 11) return 'Sender ID must not exceed 11 characters'
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return 'Sender ID may only contain letters and numbers'
  }
  return null
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address'
  }
  return null
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Phone number is required'

  const normalized = trimmed.replace(/[\s-]/g, '')

  if (/^07\d{8}$/.test(normalized)) return null
  if (/^\+2547\d{8}$/.test(normalized)) return null
  if (/^2547\d{8}$/.test(normalized)) return null

  return 'Enter a valid Kenyan phone number (07..., 254..., or +254...)'
}

function validateCertificate(body: BusinessCertificatePayload, mode: 'draft' | 'submit'): string | null {
  if (mode !== 'submit') return null

  if (!body.businessCertificateSecureUrl && !body.businessCertificateUrl) {
    return 'Business certificate is required'
  }
  if (!body.businessCertificatePublicId) {
    return 'Business certificate upload is incomplete. Please upload again.'
  }
  if (!body.businessCertificateFileName) {
    return 'Business certificate file name is missing'
  }

  const mimeType = (body.businessCertificateMimeType || '').toLowerCase()
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  const extension = body.businessCertificateFileName.split('.').pop()?.toLowerCase() || ''
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png']

  if (!allowedMimeTypes.includes(mimeType) && !allowedExtensions.includes(extension)) {
    return 'Only PDF, JPG, JPEG, and PNG files are allowed'
  }

  if (body.businessCertificateSize && body.businessCertificateSize > 5 * 1024 * 1024) {
    return 'Business certificate must be 5MB or smaller'
  }

  return null
}

export function validateSenderIdRequest(
  body: SenderIdRequestPayload,
  mode: 'draft' | 'submit'
): { errors: Record<string, string>; data: Record<string, unknown> | null } {
  const errors: Record<string, string> = {}

  const desiredSenderId = body.desiredSenderId ? normalizeDesiredSenderId(body.desiredSenderId) : ''
  const contactPerson = body.contactPerson?.trim() || ''
  const phoneNumber = body.phoneNumber?.trim() || ''
  const email = body.email?.trim() || ''
  const smsUseCase = body.smsUseCase?.trim() || ''
  const sampleSmsMessage = body.sampleSmsMessage?.trim() || ''
  const industry = body.industry?.trim() || ''

  if (mode === 'submit' || desiredSenderId) {
    const senderError = validateDesiredSenderId(desiredSenderId)
    if (senderError) errors.desiredSenderId = senderError
  }

  const certificateError = validateCertificate(body, mode)
  if (certificateError) errors.businessCertificate = certificateError

  if (mode === 'submit') {
    if (!contactPerson) errors.contactPerson = 'Contact person is required'

    const phoneError = validatePhone(phoneNumber)
    if (phoneError) errors.phoneNumber = phoneError

    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError

    if (!smsUseCase) errors.smsUseCase = 'SMS use case is required'
    else if (!SMS_USE_CASES.includes(smsUseCase as SmsUseCase)) {
      errors.smsUseCase = 'Invalid SMS use case'
    }

    if (!sampleSmsMessage) errors.sampleSmsMessage = 'Sample SMS message is required'

    if (!industry) errors.industry = 'Industry is required'
    else if (!INDUSTRIES.includes(industry as Industry)) {
      errors.industry = 'Invalid industry'
    }
  } else {
    if (smsUseCase && !SMS_USE_CASES.includes(smsUseCase as SmsUseCase)) {
      errors.smsUseCase = 'Invalid SMS use case'
    }
    if (industry && !INDUSTRIES.includes(industry as Industry)) {
      errors.industry = 'Invalid industry'
    }
    if (email && validateEmail(email)) errors.email = validateEmail(email)!
    if (phoneNumber && validatePhone(phoneNumber)) errors.phoneNumber = validatePhone(phoneNumber)!
    if (desiredSenderId) {
      const senderError = validateDesiredSenderId(desiredSenderId)
      if (senderError) errors.desiredSenderId = senderError
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, data: null }
  }

  return {
    errors,
    data: {
      desiredSenderId,
      businessCertificateUrl: body.businessCertificateUrl || '',
      businessCertificateSecureUrl: body.businessCertificateSecureUrl || '',
      businessCertificatePublicId: body.businessCertificatePublicId || '',
      businessCertificateFileName: body.businessCertificateFileName || '',
      businessCertificateMimeType: body.businessCertificateMimeType || '',
      businessCertificateSize: body.businessCertificateSize || 0,
      contactPerson,
      phoneNumber,
      email: email.toLowerCase(),
      smsUseCase,
      sampleSmsMessage,
      industry,
    },
  }
}

export function formatSenderIdRequest(doc: any) {
  return {
    id: doc._id?.toString(),
    userId: doc.userId?.toString(),
    workspaceId: doc.workspaceId?.toString(),
    desiredSenderId: doc.desiredSenderId,
    businessCertificateUrl: doc.businessCertificateUrl || '',
    businessCertificateSecureUrl: doc.businessCertificateSecureUrl || '',
    businessCertificatePublicId: doc.businessCertificatePublicId || '',
    businessCertificateFileName: doc.businessCertificateFileName || '',
    businessCertificateMimeType: doc.businessCertificateMimeType || '',
    businessCertificateSize: doc.businessCertificateSize || 0,
    contactPerson: doc.contactPerson,
    phoneNumber: doc.phoneNumber,
    email: doc.email,
    smsUseCase: doc.smsUseCase,
    sampleSmsMessage: doc.sampleSmsMessage,
    industry: doc.industry,
    status: doc.status,
    invoiceId: doc.invoiceId?.toString() || '',
    reviewNotes: doc.reviewNotes || '',
    rejectionReason: doc.rejectionReason || '',
    approvedSenderId: doc.approvedSenderId || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function formatInvoice(doc: any, desiredSenderId?: string) {
  return {
    id: doc._id?.toString(),
    userId: doc.userId?.toString(),
    workspaceId: doc.workspaceId?.toString(),
    type: doc.type,
    description: doc.description,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    senderIdRequestId: doc.senderIdRequestId?.toString(),
    desiredSenderId: desiredSenderId || '',
    mpesaCheckoutRequestId: doc.mpesaCheckoutRequestId || '',
    mpesaMerchantRequestId: doc.mpesaMerchantRequestId || '',
    mpesaReceiptNumber: doc.mpesaReceiptNumber || '',
    paymentReference: doc.paymentReference || '',
    phoneNumber: doc.phoneNumber || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    paidAt: doc.paidAt,
    failedAt: doc.failedAt,
    failureReason: doc.failureReason || '',
  }
}

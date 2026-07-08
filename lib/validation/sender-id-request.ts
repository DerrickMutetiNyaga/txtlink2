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

export interface SenderIdRequestPayload {
  desiredSenderId?: string
  businessName?: string
  businessRegistrationNumber?: string
  kraPin?: string
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

export function validateSenderIdRequest(
  body: SenderIdRequestPayload,
  mode: 'draft' | 'submit'
): { errors: Record<string, string>; data: Record<string, string> | null } {
  const errors: Record<string, string> = {}

  const desiredSenderId = body.desiredSenderId ? normalizeDesiredSenderId(body.desiredSenderId) : ''
  const businessName = body.businessName?.trim() || ''
  const businessRegistrationNumber = body.businessRegistrationNumber?.trim() || ''
  const kraPin = body.kraPin?.trim() || ''
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

  if (mode === 'submit') {
    if (!businessName) errors.businessName = 'Business / brand name is required'
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
      businessName,
      businessRegistrationNumber,
      kraPin,
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
    businessName: doc.businessName,
    businessRegistrationNumber: doc.businessRegistrationNumber || '',
    kraPin: doc.kraPin || '',
    contactPerson: doc.contactPerson,
    phoneNumber: doc.phoneNumber,
    email: doc.email,
    smsUseCase: doc.smsUseCase,
    sampleSmsMessage: doc.sampleSmsMessage,
    industry: doc.industry,
    status: doc.status,
    reviewNotes: doc.reviewNotes || '',
    rejectionReason: doc.rejectionReason || '',
    approvedSenderId: doc.approvedSenderId || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

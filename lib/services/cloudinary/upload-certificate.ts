import { v2 as cloudinary } from 'cloudinary'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const IMAGE_AND_PDF_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

const IMAGE_AND_PDF_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png'])

const WORD_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

const WORD_EXTENSIONS = new Set(['docx', 'doc'])

export interface CloudinaryUploadResult {
  url: string
  secureUrl: string
  publicId: string
  resourceType: string
  format: string
  bytes: number
  originalFilename: string
}

export function isWordDocument(fileName?: string, mimeType?: string): boolean {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const mime = (mimeType || '').toLowerCase()
  return WORD_EXTENSIONS.has(ext) || WORD_MIME_TYPES.has(mime) || mime.includes('wordprocessingml')
}

function fileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || ''
}

export function validateCertificateFile(file: File): string | null {
  return validateDocumentFile(file, { allowWord: false, label: 'Business certificate' })
}

export function validateLetterFile(file: File): string | null {
  return validateDocumentFile(file, { allowWord: true, label: 'Authorization letter' })
}

export function validateDocumentFile(
  file: File,
  options: { allowWord?: boolean; label?: string } = {}
): string | null {
  const label = options.label || 'File'
  if (!file) return `${label} is required`

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${label} must be 5MB or smaller`
  }

  const mimeType = (file.type || '').toLowerCase()
  const extension = fileExtension(file)
  const allowedMime = new Set(IMAGE_AND_PDF_MIME_TYPES)
  const allowedExt = new Set(IMAGE_AND_PDF_EXTENSIONS)
  if (options.allowWord) {
    WORD_MIME_TYPES.forEach((type) => allowedMime.add(type))
    WORD_EXTENSIONS.forEach((ext) => allowedExt.add(ext))
  }

  if (
    !allowedMime.has(mimeType) &&
    !allowedExt.has(extension) &&
    !(options.allowWord && mimeType.includes('wordprocessingml'))
  ) {
    return options.allowWord
      ? 'Only DOCX, DOC, PDF, JPG, JPEG, and PNG files are allowed'
      : 'Only PDF, JPG, JPEG, and PNG files are allowed'
  }

  return null
}

function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Please contact support.')
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export function getCertificateDownloadCandidates(params: {
  publicId?: string
  fallbackUrl?: string
  fileName?: string
  mimeType?: string
}): string[] {
  const urls: string[] = []
  const fallback = params.fallbackUrl || ''

  const push = (url?: string | null) => {
    if (url && !urls.includes(url)) urls.push(url)
  }

  const withAttachment = (url: string) => {
    if (url.includes('/upload/') && !url.includes('fl_attachment')) {
      return url.replace('/upload/', '/upload/fl_attachment/')
    }
    return url
  }

  if (fallback) {
    push(withAttachment(fallback))
    push(fallback)
  }

  if (params.publicId) {
    try {
      ensureCloudinaryConfigured()
      const preferRaw =
        isWordDocument(params.fileName, params.mimeType) ||
        (params.mimeType || '').toLowerCase().includes('pdf') ||
        (params.fileName || '').toLowerCase().endsWith('.pdf') ||
        fallback.includes('/raw/')
      const resourceTypes: Array<'raw' | 'image'> = fallback.includes('/image/')
        ? ['image', 'raw']
        : preferRaw
          ? ['raw', 'image']
          : ['image', 'raw']

      for (const resourceType of resourceTypes) {
        push(
          cloudinary.url(params.publicId, {
            resource_type: resourceType,
            type: 'upload',
            flags: 'attachment',
            sign_url: true,
            secure: true,
          })
        )
      }
    } catch {
      // Fall through to stored Cloudinary URLs
    }
  }

  return urls
}

async function uploadToCloudinary(
  file: File,
  folder: string,
  options: { allowWord?: boolean; label?: string }
): Promise<CloudinaryUploadResult> {
  const validationError = validateDocumentFile(file, options)
  if (validationError) {
    throw new Error(validationError)
  }

  ensureCloudinaryConfigured()

  const buffer = Buffer.from(await file.arrayBuffer())
  const resourceType = isWordDocument(file.name, file.type) ? 'raw' : 'auto'

  const uploadResult = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    stream.end(buffer)
  })

  return {
    url: uploadResult.url,
    secureUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type,
    format: uploadResult.format,
    bytes: uploadResult.bytes,
    originalFilename: file.name,
  }
}

export async function uploadBusinessCertificate(
  file: File,
  workspaceId: string
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, `txtlink/sender-id-certificates/${workspaceId}`, {
    allowWord: false,
    label: 'Business certificate',
  })
}

export async function uploadSenderIdLetter(
  file: File,
  workspaceId: string
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, `txtlink/sender-id-letters/${workspaceId}`, {
    allowWord: true,
    label: 'Authorization letter',
  })
}

export async function uploadPlatformDocument(
  file: File,
  folder: string
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, folder, {
    allowWord: true,
    label: 'Letter template',
  })
}

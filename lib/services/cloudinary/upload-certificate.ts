import { v2 as cloudinary } from 'cloudinary'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png'])

export interface CloudinaryUploadResult {
  url: string
  secureUrl: string
  publicId: string
  resourceType: string
  format: string
  bytes: number
  originalFilename: string
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

export function validateCertificateFile(file: File): string | null {
  if (!file) return 'Business certificate is required'

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Business certificate must be 5MB or smaller'
  }

  const mimeType = (file.type || '').toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (!ALLOWED_MIME_TYPES.has(mimeType) && !ALLOWED_EXTENSIONS.has(extension)) {
    return 'Only PDF, JPG, JPEG, and PNG files are allowed'
  }

  return null
}

export async function uploadBusinessCertificate(
  file: File,
  workspaceId: string
): Promise<CloudinaryUploadResult> {
  const validationError = validateCertificateFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  ensureCloudinaryConfigured()

  const buffer = Buffer.from(await file.arrayBuffer())
  const folder = `txtlink/sender-id-certificates/${workspaceId}`

  const uploadResult = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
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

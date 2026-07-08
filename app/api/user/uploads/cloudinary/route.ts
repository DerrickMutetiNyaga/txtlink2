/**
 * Upload business certificate to Cloudinary
 * POST /api/user/uploads/cloudinary
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { uploadBusinessCertificate } from '@/lib/services/cloudinary/upload-certificate'

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const workspaceId = user.userId
    const result = await uploadBusinessCertificate(file, workspaceId)

    return NextResponse.json({
      success: true,
      url: result.url,
      secureUrl: result.secureUrl,
      publicId: result.publicId,
      resourceType: result.resourceType,
      format: result.format,
      bytes: result.bytes,
      originalFilename: result.originalFilename,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Cloudinary upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: error.message?.includes('not configured') ? 503 : 400 }
    )
  }
}

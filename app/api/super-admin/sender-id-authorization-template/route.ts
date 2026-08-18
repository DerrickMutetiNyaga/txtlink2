/**
 * Super Admin: Sender ID authorization letter template
 * GET  /api/super-admin/sender-id-authorization-template
 * POST /api/super-admin/sender-id-authorization-template  (multipart file)
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { uploadPlatformDocument } from '@/lib/services/cloudinary/upload-certificate'

function formatTemplate(settings: any) {
  const url = settings?.senderIdAuthorizationTemplateSecureUrl || settings?.senderIdAuthorizationTemplateUrl || ''
  return {
    url,
    fileName: settings?.senderIdAuthorizationTemplateFileName || '',
    mimeType: settings?.senderIdAuthorizationTemplateMimeType || '',
    size: settings?.senderIdAuthorizationTemplateSize || 0,
    publicId: settings?.senderIdAuthorizationTemplatePublicId || '',
    hasTemplate: Boolean(url),
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    await requireOwner(request)
    const settings = await SystemSettings.findOne().lean()
    return NextResponse.json({ success: true, template: formatTemplate(settings) })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = await requireOwner(request)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const uploaded = await uploadPlatformDocument(file, 'txtlink/sender-id-templates')

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      {
        $set: {
          senderIdAuthorizationTemplateUrl: uploaded.url,
          senderIdAuthorizationTemplateSecureUrl: uploaded.secureUrl,
          senderIdAuthorizationTemplatePublicId: uploaded.publicId,
          senderIdAuthorizationTemplateFileName: uploaded.originalFilename,
          senderIdAuthorizationTemplateMimeType: file.type,
          senderIdAuthorizationTemplateSize: uploaded.bytes,
          updatedBy: new mongoose.Types.ObjectId(owner.userId),
        },
      },
      { new: true, upsert: true }
    )

    return NextResponse.json({
      success: true,
      template: formatTemplate(settings),
      message: 'Authorization letter template is now available on the Sender ID application page.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Upload sender ID letter template error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload template' },
      { status: error.message?.includes('not configured') ? 503 : 400 }
    )
  }
}

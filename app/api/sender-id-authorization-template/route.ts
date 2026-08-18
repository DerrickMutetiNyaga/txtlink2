/**
 * Logged-in users: download the Sender ID authorization letter template
 * GET /api/sender-id-authorization-template
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import { getCertificateDownloadCandidates } from '@/lib/services/cloudinary/upload-certificate'

function safeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\- ()]/g, '_').trim() || 'sender-id-authorization-letter'
  return cleaned.slice(0, 120)
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    requireAuth(request)

    const settings = await SystemSettings.findOne().lean()
    const storedUrl =
      settings?.senderIdAuthorizationTemplateSecureUrl || settings?.senderIdAuthorizationTemplateUrl
    if (!storedUrl) {
      return NextResponse.json({
        success: true,
        template: null,
      })
    }

    const download = request.nextUrl.searchParams.get('download') === '1'
    const fileName = safeFileName(
      settings?.senderIdAuthorizationTemplateFileName || 'Sender-ID-Authorization-Letter.pdf'
    )

    if (!download) {
      return NextResponse.json({
        success: true,
        template: {
          fileName,
          mimeType: settings?.senderIdAuthorizationTemplateMimeType || '',
          size: settings?.senderIdAuthorizationTemplateSize || 0,
          downloadUrl: '/api/sender-id-authorization-template?download=1',
        },
      })
    }

    const candidates = getCertificateDownloadCandidates({
      publicId: settings?.senderIdAuthorizationTemplatePublicId,
      fallbackUrl: storedUrl,
      fileName,
      mimeType: settings?.senderIdAuthorizationTemplateMimeType,
    })

    for (const fileUrl of candidates) {
      try {
        const fileRes = await fetch(fileUrl)
        if (!fileRes.ok) continue
        const buffer = Buffer.from(await fileRes.arrayBuffer())
        if (!buffer.length) continue
        const contentType =
          settings?.senderIdAuthorizationTemplateMimeType ||
          fileRes.headers.get('content-type') ||
          'application/octet-stream'
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'no-store',
          },
        })
      } catch {
        // try next
      }
    }

    return NextResponse.redirect(storedUrl)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Download authorization template error:', error)
    return NextResponse.json({ error: 'Could not download the letter template' }, { status: 500 })
  }
}

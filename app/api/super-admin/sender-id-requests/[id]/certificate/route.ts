/**
 * Super Admin: download the uploaded Sender ID certificate
 * GET /api/super-admin/sender-id-requests/[id]/certificate
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SenderIdRequest } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { getCertificateDownloadCandidates } from '@/lib/services/cloudinary/upload-certificate'

function safeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\- ()]/g, '_').trim() || 'certificate'
  return cleaned.slice(0, 120)
}

function contentDisposition(fileName: string) {
  const encoded = encodeURIComponent(fileName)
  return `attachment; filename="${fileName.replace(/"/g, '')}"; filename*=UTF-8''${encoded}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()
    await requireOwner(request)
    const { id } = await Promise.resolve(params)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid application id' }, { status: 400 })
    }

    const doc = await SenderIdRequest.findById(id).lean()
    if (!doc) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const kind = request.nextUrl.searchParams.get('kind') === 'letter' ? 'letter' : 'certificate'
    const storedUrl =
      kind === 'letter'
        ? doc.authorizationLetterSecureUrl || doc.authorizationLetterUrl
        : doc.businessCertificateSecureUrl || doc.businessCertificateUrl
    const candidates = getCertificateDownloadCandidates({
      publicId:
        kind === 'letter' ? doc.authorizationLetterPublicId : doc.businessCertificatePublicId,
      fallbackUrl: storedUrl,
      fileName:
        kind === 'letter' ? doc.authorizationLetterFileName : doc.businessCertificateFileName,
      mimeType:
        kind === 'letter' ? doc.authorizationLetterMimeType : doc.businessCertificateMimeType,
    })

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            kind === 'letter'
              ? 'No authorization letter was uploaded for this application'
              : 'No certificate was uploaded for this application',
        },
        { status: 404 }
      )
    }

    const fileName = safeFileName(
      (kind === 'letter' ? doc.authorizationLetterFileName : doc.businessCertificateFileName) ||
        `${doc.desiredSenderId || 'document'}-${kind}.pdf`
    )

    for (const fileUrl of candidates) {
      try {
        const fileRes = await fetch(fileUrl)
        if (!fileRes.ok) continue

        const contentType =
          (kind === 'letter' ? doc.authorizationLetterMimeType : doc.businessCertificateMimeType) ||
          fileRes.headers.get('content-type') ||
          'application/octet-stream'
        const buffer = Buffer.from(await fileRes.arrayBuffer())
        if (!buffer.length) continue

        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition(fileName),
            'Content-Length': String(buffer.length),
            'Cache-Control': 'no-store',
          },
        })
      } catch {
        // Try the next Cloudinary URL
      }
    }

    return NextResponse.json({
      url: candidates[0],
      fileName,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Download sender ID certificate error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

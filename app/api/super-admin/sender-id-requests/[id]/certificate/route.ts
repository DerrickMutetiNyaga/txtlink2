/**
 * Super Admin: download the uploaded Sender ID certificate
 * GET /api/super-admin/sender-id-requests/[id]/certificate
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { SenderIdRequest } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'

function safeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\- ()]/g, '_').trim() || 'certificate'
  return cleaned.slice(0, 120)
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

    const fileUrl = doc.businessCertificateSecureUrl || doc.businessCertificateUrl
    if (!fileUrl) {
      return NextResponse.json({ error: 'No certificate was uploaded for this application' }, { status: 404 })
    }

    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: 'Could not download the certificate file from storage' },
        { status: 502 }
      )
    }

    const fileName = safeFileName(doc.businessCertificateFileName || `${doc.desiredSenderId || 'certificate'}.pdf`)
    const contentType = doc.businessCertificateMimeType || fileRes.headers.get('content-type') || 'application/octet-stream'
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
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

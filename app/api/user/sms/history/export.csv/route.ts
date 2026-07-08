import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireAuth } from '@/lib/auth/middleware'
import mongoose from 'mongoose'
import { parseSmsHistoryQuery } from '@/lib/services/sms-history/query'
import {
  formatSmsHistoryCsvRow,
  SMS_HISTORY_CSV_HEADERS,
} from '@/lib/services/sms-history/format'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireAuth(request)
    const userId = new mongoose.Types.ObjectId(user.userId)
    const { searchParams } = new URL(request.url)

    const params = {
      userId,
      status: searchParams.get('status') || 'all',
      senderId: searchParams.get('senderId') || 'all',
      campaign: searchParams.get('campaign') || 'all',
      country: searchParams.get('country') || 'all',
      fromDate: searchParams.get('fromDate') || searchParams.get('startDate'),
      toDate: searchParams.get('toDate') || searchParams.get('endDate'),
      search: searchParams.get('search') || '',
      page: 1,
      limit: 100,
    }

    const { filter } = parseSmsHistoryQuery(params)
    const filenameDate = new Date().toISOString().slice(0, 10)

    const cursor = SmsMessage.find(filter).sort({ createdAt: -1 }).cursor()
    const chunks: string[] = [SMS_HISTORY_CSV_HEADERS.join(',')]
    let rowCount = 0
    const maxRows = 100_000

    for await (const doc of cursor) {
      chunks.push(formatSmsHistoryCsvRow(doc as Parameters<typeof formatSmsHistoryCsvRow>[0]))
      rowCount++
      if (rowCount >= maxRows) break
    }

    const csv = chunks.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sms-history-${filenameDate}.csv"`,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('SMS history CSV export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

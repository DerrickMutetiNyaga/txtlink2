/**
 * Sync delivery reports from HostPinnacle (fallback when webhook is down).
 * POST /api/super-admin/dlr-sync
 *
 * Uses HostPinnacle Report API: Get Delivery Report (date range) or Check MIS by Transaction ID.
 * Updates SmsMessages with status 'sent' to 'delivered' or 'failed' when we get a report.
 * Super-admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SmsMessage } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'
import { applyDlrToMessage } from '@/lib/utils/dlr-update'

const MAX_MESSAGES_TO_CHECK = 150
const DATE_RANGE_DAYS = 14

export async function POST(request: NextRequest) {
  try {
    requireOwner(request)
    await connectDB()
  } catch (e: any) {
    if (e.message === 'Forbidden' || e.message === 'Unauthorized') {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: e.message || 'DB error' }, { status: 500 })
  }

  const errors: string[] = []
  let updated = 0
  let checked = 0

  try {
    const sentMessages = await SmsMessage.find({
      status: 'sent',
      hpTransactionId: { $exists: true, $ne: null, $ne: '' },
    })
      .sort({ sentAt: 1 })
      .limit(MAX_MESSAGES_TO_CHECK)
      .lean()

    if (sentMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending sent messages to sync.',
        updated: 0,
        checked: 0,
      })
    }

    const oldest = sentMessages[0].sentAt ? new Date(sentMessages[0].sentAt) : new Date()
    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - DATE_RANGE_DAYS * 24 * 60 * 60 * 1000)
    const fromStr = fromDate.toISOString().slice(0, 10)
    const toStr = toDate.toISOString().slice(0, 10)

    // 1) Try Get Delivery Report (date range)
    const reportResult = await hostPinnacleClient.getDeliveryReport({
      fromDate: fromStr,
      toDate: toStr,
    })

    const reportList = normalizeReportList(reportResult)
    if (reportList.length > 0) {
      for (const row of reportList) {
        const txnId = String(row.transactionId ?? row.Transactionid ?? row.transactionid ?? '').trim()
        if (!txnId) continue
        const msg = sentMessages.find((m) => String(m.hpTransactionId) === txnId)
        if (!msg) continue
        checked++
        const applied = await applyDlrToMessage(msg as any, {
          ...row,
          transactionId: txnId,
          status: row.status ?? row.Status,
          deliveredTime: row.deliveredTime ?? row.DeliveredTime ?? row.deliveredTime,
          errorCode: row.errorCode ?? row.ErrorCode,
          errorMessage: row.errorMessage ?? row.errormessage,
        })
        if (applied) {
          await SmsMessage.findByIdAndUpdate(msg._id, applied.updateData)
          updated++
        }
      }
      return NextResponse.json({
        success: true,
        message: `Synced from Get Delivery Report (${fromStr} to ${toStr}).`,
        updated,
        checked,
        reportRows: reportList.length,
        errors: errors.length ? errors : undefined,
      })
    }

    // 2) Fallback: Check MIS by Transaction ID for each sent message
    for (const msg of sentMessages) {
      const txnId = String(msg.hpTransactionId || '').trim()
      if (!txnId) continue
      try {
        const mis = await hostPinnacleClient.checkMisByTransactionId({ transactionId: txnId })
        checked++
        if (!mis.success || !mis.data) continue
        const data = mis.data as Record<string, unknown>
        const applied = await applyDlrToMessage(msg as any, {
          transactionId: txnId,
          status: data.status ?? data.Status,
          deliveredTime: data.deliveredTime ?? data.DeliveredTime ?? data.deliveredtime,
          errorCode: data.errorCode ?? data.ErrorCode,
          errorMessage: data.errorMessage ?? data.errormessage,
        })
        if (applied) {
          await SmsMessage.findByIdAndUpdate(msg._id, applied.updateData)
          updated++
        }
      } catch (err: any) {
        errors.push(`${txnId}: ${err.message || 'check failed'}`)
      }
      await new Promise((r) => setTimeout(r, 150))
    }

    return NextResponse.json({
      success: true,
      message: 'Synced via Check MIS by Transaction ID.',
      updated,
      checked,
      errors: errors.length ? errors.slice(0, 20) : undefined,
    })
  } catch (err: any) {
    console.error('DLR sync error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Sync failed',
        updated,
        checked,
        errors: errors.length ? errors.slice(0, 10) : undefined,
      },
      { status: 500 }
    )
  }
}

function normalizeReportList(result: { success: boolean; data?: any }): any[] {
  if (!result.success || result.data == null) return []
  const d = result.data
  if (Array.isArray(d)) return d
  if (Array.isArray(d.report)) return d.report
  if (Array.isArray(d.data)) return d.data
  if (Array.isArray(d.list)) return d.list
  if (Array.isArray(d.reports)) return d.reports
  if (d.response && Array.isArray(d.response)) return d.response
  return []
}

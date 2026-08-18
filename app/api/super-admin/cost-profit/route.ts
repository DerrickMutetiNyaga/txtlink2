/**
 * Super Admin: buying/selling price and live profit
 * GET  /api/super-admin/cost-profit
 * POST /api/super-admin/cost-profit
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'
import { PricingRule, SystemSettings, Transaction } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'
import { resolvePricePerCreditKes } from '@/lib/utils/resolve-price-per-credit'
import { getBuyingPriceKes } from '@/lib/services/profit'
import { profitPerSms, purchaseCostAndProfit, roundKes } from '@/lib/utils/cost-profit'

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function periodMatch(from?: Date) {
  const match: Record<string, unknown> = { type: 'top-up', status: 'completed' }
  if (from) match.createdAt = { $gte: from }
  return match
}

async function aggregatePurchaseProfit(buyingPriceKes: number, from?: Date) {
  const rows = await Transaction.aggregate([
    { $match: periodMatch(from) },
    {
      $addFields: {
        credits: {
          $ifNull: [
            '$metadata.creditsAdded',
            {
              $cond: [
                { $gt: [{ $ifNull: ['$metadata.creditsDelta', 0] }, 0] },
                '$metadata.creditsDelta',
                0,
              ],
            },
          ],
        },
        paidKes: { $ifNull: ['$metadata.amountKes', '$amount'] },
        storedProfit: '$metadata.profitKes',
        storedCost: '$metadata.providerCostKes',
      },
    },
    {
      $addFields: {
        providerCost: {
          $ifNull: ['$storedCost', { $multiply: ['$credits', buyingPriceKes] }],
        },
        profit: {
          $ifNull: [
            '$storedProfit',
            { $subtract: ['$paidKes', { $ifNull: ['$storedCost', { $multiply: ['$credits', buyingPriceKes] }] }] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        purchases: { $sum: 1 },
        creditsSold: { $sum: '$credits' },
        revenueKes: { $sum: '$paidKes' },
        costKes: { $sum: '$providerCost' },
        profitKes: { $sum: '$profit' },
      },
    },
  ])

  const row = rows[0]
  return {
    purchases: row?.purchases || 0,
    creditsSold: row?.creditsSold || 0,
    revenueKes: roundKes(row?.revenueKes || 0),
    costKes: roundKes(row?.costKes || 0),
    profitKes: roundKes(row?.profitKes || 0),
  }
}

async function applySellingPriceToGlobalRule(sellingPriceKes: number, updatedBy: string) {
  const updatedById = new mongoose.Types.ObjectId(updatedBy)
  const existing = await PricingRule.findOne({ scope: 'global' })

  if (!existing) {
    await PricingRule.create({
      scope: 'global',
      mode: 'per_sms',
      gsm7Part1: 160,
      gsm7PartN: 153,
      ucs2Part1: 70,
      ucs2PartN: 67,
      pricePerSms: sellingPriceKes,
      pricePerPart: sellingPriceKes,
      chargeFailed: false,
      refundOnFail: true,
      updatedBy: updatedById,
    })
    return
  }

  if (existing.mode === 'per_sms') {
    existing.pricePerSms = sellingPriceKes
  } else if (existing.mode === 'per_part') {
    existing.pricePerPart = sellingPriceKes
  } else if (existing.mode === 'per_char_block') {
    existing.pricePerBlock = sellingPriceKes
  } else if (existing.mode === 'per_character') {
    existing.pricePerCharacter = sellingPriceKes / 153
  } else {
    existing.pricePerPart = sellingPriceKes
    existing.pricePerSms = sellingPriceKes
  }

  existing.updatedBy = updatedById
  await existing.save()
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    await requireOwner(request)

    const buyingPriceKes = await getBuyingPriceKes()
    const sellingPriceKes = await resolvePricePerCreditKes()

    const [today, last7d, last30d, allTime, recent] = await Promise.all([
      aggregatePurchaseProfit(buyingPriceKes, startOfToday()),
      aggregatePurchaseProfit(buyingPriceKes, daysAgo(7)),
      aggregatePurchaseProfit(buyingPriceKes, daysAgo(30)),
      aggregatePurchaseProfit(buyingPriceKes),
      Transaction.find({ type: 'top-up', status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(25)
        .populate('userId', 'name email')
        .lean(),
    ])

    const recentPurchases = (recent || []).map((tx: any) => {
      const credits = Number(tx.metadata?.creditsAdded ?? (tx.metadata?.creditsDelta > 0 ? tx.metadata.creditsDelta : 0) ?? 0)
      const paidKes = Number(tx.metadata?.amountKes ?? tx.amount ?? 0)
      const selling = Number(tx.metadata?.sellingPriceKes ?? tx.metadata?.pricePerCreditKes ?? sellingPriceKes)
      const buying = Number(tx.metadata?.buyingPriceKes ?? buyingPriceKes)
      const computed = purchaseCostAndProfit({ paidKes, credits, buyingPriceKes: buying })
      const user = tx.userId && typeof tx.userId === 'object' ? tx.userId : null

      return {
        id: String(tx._id),
        createdAt: tx.createdAt,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        paidKes,
        credits,
        sellingPriceKes: selling,
        buyingPriceKes: buying,
        costKes: Number.isFinite(Number(tx.metadata?.providerCostKes))
          ? Number(tx.metadata.providerCostKes)
          : computed.providerCostKes,
        profitKes: Number.isFinite(Number(tx.metadata?.profitKes))
          ? Number(tx.metadata.profitKes)
          : computed.profitKes,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        buyingPriceKes,
        sellingPriceKes,
        profitPerSmsKes: profitPerSms(buyingPriceKes, sellingPriceKes),
        periods: { today, last7d, last30d, allTime },
        recentPurchases,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Cost-profit GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = await requireOwner(request)
    const body = await request.json()

    const buyingPriceKes = Number(body.buyingPriceKes)
    const sellingPriceKes = Number(body.sellingPriceKes)

    if (!Number.isFinite(buyingPriceKes) || buyingPriceKes < 0) {
      return NextResponse.json({ error: 'Buying price must be 0 or greater' }, { status: 400 })
    }
    if (!Number.isFinite(sellingPriceKes) || sellingPriceKes <= 0) {
      return NextResponse.json({ error: 'Selling price must be greater than 0' }, { status: 400 })
    }

    let settings = await SystemSettings.findOne()
    const before = settings ? settings.toObject() : null

    if (!settings) {
      settings = await SystemSettings.create({
        updatedBy: new mongoose.Types.ObjectId(owner.userId),
        globalProviderCostPerPart: buyingPriceKes,
        defaultProviderCostPerPart: buyingPriceKes,
        globalDefaultPricePerPart: sellingPriceKes,
      })
    } else {
      settings.globalProviderCostPerPart = buyingPriceKes
      settings.defaultProviderCostPerPart = buyingPriceKes
      settings.globalDefaultPricePerPart = sellingPriceKes
      settings.updatedBy = new mongoose.Types.ObjectId(owner.userId)
      await settings.save()
    }

    await applySellingPriceToGlobalRule(sellingPriceKes, owner.userId)

    await logAudit('UPDATE_COST_PROFIT', 'system_settings', owner.userId, owner.email, {
      resourceId: settings._id?.toString(),
      changes: {
        buyingPriceKes: { before: before?.globalProviderCostPerPart, after: buyingPriceKes },
        sellingPriceKes: { before: before?.globalDefaultPricePerPart, after: sellingPriceKes },
      },
      request,
    })

    return NextResponse.json({
      success: true,
      data: {
        buyingPriceKes,
        sellingPriceKes,
        profitPerSmsKes: profitPerSms(buyingPriceKes, sellingPriceKes),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Cost-profit POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

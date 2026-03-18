/**
 * Sender ID Pricing API
 * GET /api/sender-id-pricing - Get Sender ID pricing (public)
 * POST /api/sender-id-pricing - Update Sender ID pricing (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderIdPricing } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'

// Cache for pricing data (5 minutes)
let pricingCache: {
  data: any
  timestamp: number
} | null = null

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Public endpoint - no auth required
export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (pricingCache && Date.now() - pricingCache.timestamp < CACHE_TTL) {
      const cachedResponse = NextResponse.json({
        success: true,
        pricing: pricingCache.data,
      })
      cachedResponse.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      return cachedResponse
    }

    await connectDB()

    // Get the Sender ID pricing document (singleton)
    let pricing = await SenderIdPricing.findOne({}).lean()

    // If no pricing exists, return default values
    if (!pricing) {
      const defaultPricing = {
        registrationFee: 5000,
        approvalTimeline: '3-5 business days after document submission',
        requiredDocuments: [
          'Business registration certificate',
          'Company letterhead',
          'Authorized signatory ID',
        ],
        description: 'One-time setup fee for new Sender ID registration and approval processing. No annual renewal fees.',
      }

      // Cache default pricing
      pricingCache = {
        data: defaultPricing,
        timestamp: Date.now(),
      }

      const defaultResponse = NextResponse.json({
        success: true,
        pricing: defaultPricing,
      })
      defaultResponse.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      return defaultResponse
    }

    const pricingData = {
      registrationFee: pricing.registrationFee,
      approvalTimeline: pricing.approvalTimeline,
      requiredDocuments: pricing.requiredDocuments,
      description: pricing.description,
    }

    // Update cache
    pricingCache = {
      data: pricingData,
      timestamp: Date.now(),
    }

    const response = NextResponse.json({
      success: true,
      pricing: pricingData,
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

    return response
  } catch (error: any) {
    console.error('Get Sender ID pricing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Super admin endpoint - requires owner auth
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const owner = requireOwner(request)
    const mongoose = require('mongoose')

    const { registrationFee, approvalTimeline, requiredDocuments, description } = await request.json()

    // Validate required fields
    if (registrationFee === undefined || registrationFee === null) {
      return NextResponse.json({ error: 'Registration fee is required' }, { status: 400 })
    }

    if (!approvalTimeline || typeof approvalTimeline !== 'string') {
      return NextResponse.json({ error: 'Approval timeline is required' }, { status: 400 })
    }

    if (!requiredDocuments || !Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
      return NextResponse.json({ error: 'Required documents array is required' }, { status: 400 })
    }

    // Find existing or create new
    const existing = await SenderIdPricing.findOne({})

    const pricingData: any = {
      registrationFee: Number(registrationFee),
      approvalTimeline,
      requiredDocuments,
      description: description || 'One-time setup fee for new Sender ID registration and approval processing. No annual renewal fees.',
      updatedBy: new mongoose.Types.ObjectId(owner.userId),
    }

    let pricing
    if (existing) {
      pricing = await SenderIdPricing.findByIdAndUpdate(existing._id, pricingData, { new: true })
      await logAudit('UPDATE_SENDER_ID_PRICING', 'sender_id_pricing', owner.userId, owner.email, {
        resourceId: pricing._id.toString(),
        changes: pricingData,
        request,
      })
    } else {
      pricing = await SenderIdPricing.create(pricingData)
      await logAudit('CREATE_SENDER_ID_PRICING', 'sender_id_pricing', owner.userId, owner.email, {
        resourceId: pricing._id.toString(),
        changes: pricingData,
        request,
      })
    }

    const updatedPricingData = {
      registrationFee: pricing.registrationFee,
      approvalTimeline: pricing.approvalTimeline,
      requiredDocuments: pricing.requiredDocuments,
      description: pricing.description,
    }

    // Invalidate cache
    pricingCache = {
      data: updatedPricingData,
      timestamp: Date.now(),
    }

    return NextResponse.json({
      success: true,
      pricing: updatedPricingData,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Update Sender ID pricing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


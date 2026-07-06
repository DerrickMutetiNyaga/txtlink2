/**
 * Marketing Pricing API
 * GET /api/marketing-pricing - Get marketing pricing (public)
 * POST /api/marketing-pricing - Update marketing pricing (super admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { MarketingPricing } from '@/lib/db/models'
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

    // Get the marketing pricing document (singleton)
    let pricing = await MarketingPricing.findOne({}).lean()

    // If no pricing exists, return default values
    if (!pricing) {
      const defaultPricing = {
        pageTitle: 'Simple, Transparent Pricing',
        pageSubtitle: 'Scale your messaging without hidden fees. Only pay for what you send.',
        tiers: [
            {
              name: 'Starter',
              price: 'KSh 0.3',
              priceDecimal: '',
              unit: 'per SMS',
              description: 'For growing businesses starting their SMS journey',
              icon: 'Rocket',
              accentColor: 'teal',
            features: [
              { text: 'Up to 10,000 SMS/month', category: 'Sending', highlight: false },
              { text: 'Basic sender ID', category: 'Sending', highlight: false },
              { text: 'REST API access', category: 'API', highlight: true },
              { text: 'Email support', category: 'Support', highlight: false },
              { text: 'Standard routing', category: 'Sending', highlight: false },
              { text: 'Web dashboard', category: 'Support', highlight: false },
            ],
            cta: 'Get Started',
            ctaSecondary: 'See full API docs',
            highlighted: false,
          },
            {
              name: 'Professional',
              price: 'KSh 0.25',
              priceDecimal: '',
              unit: 'per SMS',
              description: 'For established businesses with high volume',
              icon: 'ShieldCheck',
              accentColor: 'indigo',
            features: [
              { text: 'Unlimited SMS volume', category: 'Sending', highlight: true },
              { text: 'Dedicated sender ID', category: 'Sending', highlight: false },
              { text: 'REST + SMPP APIs', category: 'API', highlight: true },
              { text: 'Priority 24/7 support', category: 'Support', highlight: false },
              { text: 'Advanced analytics', category: 'Support', highlight: false },
              { text: 'Carrier optimization', category: 'Sending', highlight: false },
              { text: 'Webhook integration', category: 'API', highlight: false },
              { text: 'Custom templates', category: 'Sending', highlight: false },
            ],
            cta: 'Start Free Trial',
            ctaSecondary: 'Compare plans',
            highlighted: true,
            highlightReason: 'Best balance of cost + deliverability',
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            priceDecimal: '',
            unit: 'pricing',
            description: 'For large-scale operations and institutions',
            icon: 'Building2',
            accentColor: 'slate',
            features: [
              { text: 'Unlimited everything', category: 'Sending', highlight: true },
              { text: 'Multiple dedicated sender IDs', category: 'Sending', highlight: false },
              { text: 'Custom API solutions', category: 'API', highlight: true },
              { text: 'Dedicated account manager', category: 'Support', highlight: false },
              { text: '99.99% SLA guarantee', category: 'Support', highlight: false },
              { text: 'Custom infrastructure', category: 'Sending', highlight: false },
              { text: 'Dedicated support team', category: 'Support', highlight: false },
              { text: 'Volume-based pricing', category: 'Sending', highlight: false },
            ],
            cta: 'Request Quote',
            ctaSecondary: 'Talk to an engineer',
            highlighted: false,
          },
        ],
          volumeDiscounts: [
            { volume: '1M - 10M', discount: '10%', price: 'KSh 0.26' },
            { volume: '10M - 50M', discount: '15%', price: 'KSh 0.21' },
            { volume: '50M - 100M', discount: '20%', price: 'KSh 0.15' },
            { volume: '100M+', discount: 'Custom', price: 'Contact' },
          ],
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
      pageTitle: pricing.pageTitle,
      pageSubtitle: pricing.pageSubtitle,
      tiers: pricing.tiers,
      volumeDiscounts: pricing.volumeDiscounts,
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
    console.error('Get marketing pricing error:', error)
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

    const { pageTitle, pageSubtitle, tiers, volumeDiscounts } = await request.json()

    // Validate required fields
    if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json({ error: 'Tiers array is required' }, { status: 400 })
    }

    if (!volumeDiscounts || !Array.isArray(volumeDiscounts)) {
      return NextResponse.json({ error: 'Volume discounts array is required' }, { status: 400 })
    }

    // Find existing or create new
    const existing = await MarketingPricing.findOne({})

    const pricingData: any = {
      pageTitle: pageTitle || 'Simple, Transparent Pricing',
      pageSubtitle: pageSubtitle || 'Scale your messaging without hidden fees. Only pay for what you send.',
      tiers,
      volumeDiscounts,
      updatedBy: new mongoose.Types.ObjectId(owner.userId),
    }

    let pricing
    if (existing) {
      pricing = await MarketingPricing.findByIdAndUpdate(existing._id, pricingData, { new: true })
      await logAudit('UPDATE_MARKETING_PRICING', 'marketing_pricing', owner.userId, owner.email, {
        resourceId: pricing._id.toString(),
        changes: pricingData,
        request,
      })
    } else {
      pricing = await MarketingPricing.create(pricingData)
      await logAudit('CREATE_MARKETING_PRICING', 'marketing_pricing', owner.userId, owner.email, {
        resourceId: pricing._id.toString(),
        changes: pricingData,
        request,
      })
    }

    const updatedPricingData = {
      pageTitle: pricing.pageTitle,
      pageSubtitle: pricing.pageSubtitle,
      tiers: pricing.tiers,
      volumeDiscounts: pricing.volumeDiscounts,
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
    console.error('Update marketing pricing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


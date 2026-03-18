import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SenderIdAd } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import mongoose from 'mongoose'

// GET - Fetch active sender ID ad
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const ad = await SenderIdAd.findOne({ isActive: true }).lean()
    
    if (!ad) {
      return NextResponse.json({ ad: null })
    }
    
    // Increment views
    await SenderIdAd.findByIdAndUpdate(ad._id, { $inc: { views: 1 } })
    
    return NextResponse.json({ ad })
  } catch (error) {
    console.error('Error fetching sender ID ad:', error)
    return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 })
  }
}

// POST - Create or update sender ID ad (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const owner = requireOwner(request)
    await connectDB()
    
    const body = await request.json()
    const {
      title,
      description,
      senderIdName,
      price,
      priceUnit,
      ctaText,
      ctaLink,
      isActive,
      displayFrequency,
      showOnPages,
      backgroundColor,
      textColor,
      accentColor,
      icon,
    } = body
    
    // If activating, deactivate all other ads
    if (isActive) {
      await SenderIdAd.updateMany({ isActive: true }, { isActive: false })
    }
    
    // Find existing ad or create new one
    let ad = await SenderIdAd.findOne({ isActive: isActive ? true : { $exists: true } })
    
    if (ad) {
      // Update existing ad
      ad.title = title
      ad.description = description
      ad.senderIdName = senderIdName
      ad.price = price
      ad.priceUnit = priceUnit || 'per month'
      ad.ctaText = ctaText || 'Get Started'
      ad.ctaLink = ctaLink || '/app/sender-ids'
      ad.isActive = isActive
      ad.displayFrequency = displayFrequency || 'medium'
      ad.showOnPages = showOnPages || ['dashboard', 'send-sms']
      ad.backgroundColor = backgroundColor || '#ECFDF5'
      ad.textColor = textColor || '#065F46'
      ad.accentColor = accentColor || '#0F766E'
      ad.icon = icon
      ad.updatedBy = new mongoose.Types.ObjectId(owner.userId)
      await ad.save()
    } else {
      // Create new ad
      ad = await SenderIdAd.create({
        title,
        description,
        senderIdName,
        price,
        priceUnit: priceUnit || 'per month',
        ctaText: ctaText || 'Get Started',
        ctaLink: ctaLink || '/app/sender-ids',
        isActive: isActive || false,
        displayFrequency: displayFrequency || 'medium',
        showOnPages: showOnPages || ['dashboard', 'send-sms'],
        backgroundColor: backgroundColor || '#ECFDF5',
        textColor: textColor || '#065F46',
        accentColor: accentColor || '#0F766E',
        icon,
        views: 0,
        clicks: 0,
        updatedBy: new mongoose.Types.ObjectId(owner.userId),
      })
    }
    
    return NextResponse.json({ ad, message: 'Sender ID ad saved successfully' })
  } catch (error) {
    console.error('Error saving sender ID ad:', error)
    return NextResponse.json({ error: 'Failed to save ad' }, { status: 500 })
  }
}

// PUT - Track click
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { adId } = body
    
    if (adId) {
      await SenderIdAd.findByIdAndUpdate(adId, { $inc: { clicks: 1 } })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking click:', error)
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 })
  }
}


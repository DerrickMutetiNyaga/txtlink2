/**
 * Super Admin M-Pesa C2B URL Registration
 * GET /api/super-admin/mpesa/register-c2b-urls
 * 
 * Registers C2B validation and confirmation URLs with M-Pesa
 * Uses URLs configured in SystemSettings
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { MpesaService } from '@/lib/services/mpesa/mpesa-service'
import { logAudit } from '@/lib/utils/audit'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireOwner(request)

    // Get M-Pesa configuration
    const settings = await SystemSettings.findOne()
    if (!settings || !settings.mpesaEnabled) {
      return NextResponse.json(
        { error: 'M-Pesa gateway is not enabled. Please enable it in settings first.' },
        { status: 400 }
      )
    }

    if (!settings.mpesaValidationUrl || !settings.mpesaConfirmationUrl) {
      return NextResponse.json(
        { error: 'Validation URL and Confirmation URL must be configured in settings first.' },
        { status: 400 }
      )
    }

    // Create M-Pesa service instance
    const mpesaService = await MpesaService.createFromSettings()
    if (!mpesaService) {
      return NextResponse.json(
        { error: 'M-Pesa configuration is incomplete. Please check your credentials.' },
        { status: 400 }
      )
    }

    // Register C2B URLs
    const result = await mpesaService.registerC2BUrls(
      settings.mpesaValidationUrl,
      settings.mpesaConfirmationUrl
    )

    // Log audit
    await logAudit(
      'REGISTER_C2B_URLS',
      'mpesa_configuration',
      user.userId,
      user.email,
      {
        validationUrl: settings.mpesaValidationUrl,
        confirmationUrl: settings.mpesaConfirmationUrl,
        response: result,
        request,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'C2B URLs registered successfully',
      data: result,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('C2B URL registration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to register C2B URLs',
        details: error.message,
      },
      { status: 500 }
    )
  }
}


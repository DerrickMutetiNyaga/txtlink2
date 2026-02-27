/**
 * Super Admin Settings API
 * GET /api/super-admin/settings - Get system settings
 * POST /api/super-admin/settings - Update system settings
 */

import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import { SystemSettings } from '@/lib/db/models'
import { requireOwner } from '@/lib/auth/middleware'
import { logAudit } from '@/lib/utils/audit'
import { clearHostPinnacleSettingsCache } from '@/lib/services/hostpinnacle/client'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = requireOwner(request)

    // Get or create system settings (singleton)
    let settings = await SystemSettings.findOne()
    
    if (!settings) {
      // Create default settings
      settings = await SystemSettings.create({
        updatedBy: new mongoose.Types.ObjectId(user.userId),
      })
    }

    // Don't expose the full API key - mask it
    const settingsObj = settings.toObject()
    if (settingsObj.providerApiKey) {
      const masked = settingsObj.providerApiKey.length > 8 
        ? settingsObj.providerApiKey.substring(0, 4) + '••••••••' + settingsObj.providerApiKey.substring(settingsObj.providerApiKey.length - 4)
        : '••••••••'
      settingsObj.providerApiKey = masked
    }

    // Mask HostPinnacle credentials
    const maskValue = (value: string | undefined) => {
      if (!value) return undefined
      return value.length > 8 
        ? value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
        : '••••••••'
    }

    if (settingsObj.hostpinnacleUserId) {
      settingsObj.hostpinnacleUserId = maskValue(settingsObj.hostpinnacleUserId)
    }
    if (settingsObj.hostpinnaclePassword) {
      settingsObj.hostpinnaclePassword = maskValue(settingsObj.hostpinnaclePassword)
    }
    if (settingsObj.hostpinnacleApiKey) {
      settingsObj.hostpinnacleApiKey = maskValue(settingsObj.hostpinnacleApiKey)
    }

    // Mask M-Pesa credentials
    const maskValue = (value: string | undefined) => {
      if (!value) return undefined
      return value.length > 8 
        ? value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
        : '••••••••'
    }

    if (settingsObj.mpesaConsumerKey) {
      settingsObj.mpesaConsumerKey = maskValue(settingsObj.mpesaConsumerKey)
    }
    if (settingsObj.mpesaConsumerSecret) {
      settingsObj.mpesaConsumerSecret = maskValue(settingsObj.mpesaConsumerSecret)
    }
    if (settingsObj.mpesaPasskey) {
      settingsObj.mpesaPasskey = maskValue(settingsObj.mpesaPasskey)
    }

    return NextResponse.json({
      success: true,
      data: settingsObj,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = requireOwner(request)

    const body = await request.json()
    const {
      // Platform Configuration
      platformName,
      defaultCurrency,
      timezone,
      dateFormat,
      environment,
      
      // SMS Provider Settings
      providerName,
      providerApiKey,
      defaultProviderCostPerPart,
      retryPolicy,
      deliveryReportWebhookEnabled,
      
      // Pricing & Cost Controls
      globalDefaultPricePerPart,
      globalProviderCostPerPart,
      defaultChargeOnFailure,
      defaultRefundOnFailure,
      
      // Security & Compliance
      requireSenderIdApproval,
      logAllAdminActions,
      lockPricingEditsToSuperAdmin,
      enableIpLogging,
      
      // System Defaults
      defaultSmsEncoding,
      defaultSenderIdBehavior,
      defaultAccountCreditLimit,
      
      // Danger Zone
      smsSendingEnabled,
      
      // M-Pesa Configuration
      mpesaConsumerKey,
      mpesaConsumerSecret,
      mpesaPasskey,
      mpesaShortcode,
      mpesaConfirmationUrl,
      mpesaValidationUrl,
      mpesaCallbackUrl,
      mpesaEnvironment,
      mpesaEnabled,
      
      // HostPinnacle Configuration
      hostpinnacleBaseUrl,
      hostpinnacleUserId,
      hostpinnaclePassword,
      hostpinnacleApiKey,
      hostpinnacleStatusEndpoint,
      hostpinnacleTimeout,
      hostpinnacleSmsSendTimeout,
      hostpinnacleStatusTimeout,
    } = body

    // Get existing settings to track changes
    let settings = await SystemSettings.findOne()
    const before = settings ? settings.toObject() : null

    // Prepare update object
    const updateData: any = {
      updatedBy: new mongoose.Types.ObjectId(user.userId),
    }

    // Only update fields that are provided
    if (platformName !== undefined) updateData.platformName = platformName
    if (defaultCurrency !== undefined) updateData.defaultCurrency = defaultCurrency
    if (timezone !== undefined) updateData.timezone = timezone
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat
    if (environment !== undefined) updateData.environment = environment
    
    if (providerName !== undefined) updateData.providerName = providerName
    if (providerApiKey !== undefined && providerApiKey !== '') {
      // Only update if a new key is provided (not masked value)
      if (!providerApiKey.includes('••••')) {
        updateData.providerApiKey = providerApiKey
      }
    }
    if (defaultProviderCostPerPart !== undefined) updateData.defaultProviderCostPerPart = defaultProviderCostPerPart
    if (retryPolicy !== undefined) updateData.retryPolicy = Math.max(0, Math.min(3, retryPolicy))
    if (deliveryReportWebhookEnabled !== undefined) updateData.deliveryReportWebhookEnabled = deliveryReportWebhookEnabled
    
    if (globalDefaultPricePerPart !== undefined) updateData.globalDefaultPricePerPart = globalDefaultPricePerPart
    if (globalProviderCostPerPart !== undefined) updateData.globalProviderCostPerPart = globalProviderCostPerPart
    if (defaultChargeOnFailure !== undefined) updateData.defaultChargeOnFailure = defaultChargeOnFailure
    if (defaultRefundOnFailure !== undefined) updateData.defaultRefundOnFailure = defaultRefundOnFailure
    
    if (requireSenderIdApproval !== undefined) updateData.requireSenderIdApproval = requireSenderIdApproval
    if (logAllAdminActions !== undefined) updateData.logAllAdminActions = logAllAdminActions
    if (lockPricingEditsToSuperAdmin !== undefined) updateData.lockPricingEditsToSuperAdmin = lockPricingEditsToSuperAdmin
    if (enableIpLogging !== undefined) updateData.enableIpLogging = enableIpLogging
    
    if (defaultSmsEncoding !== undefined) updateData.defaultSmsEncoding = defaultSmsEncoding
    if (defaultSenderIdBehavior !== undefined) updateData.defaultSenderIdBehavior = defaultSenderIdBehavior
    if (defaultAccountCreditLimit !== undefined) updateData.defaultAccountCreditLimit = defaultAccountCreditLimit
    
    if (smsSendingEnabled !== undefined) updateData.smsSendingEnabled = smsSendingEnabled

    // M-Pesa Configuration
    if (mpesaConsumerKey !== undefined && mpesaConsumerKey !== '' && !mpesaConsumerKey.includes('••••')) {
      updateData.mpesaConsumerKey = mpesaConsumerKey
    }
    if (mpesaConsumerSecret !== undefined && mpesaConsumerSecret !== '' && !mpesaConsumerSecret.includes('••••')) {
      updateData.mpesaConsumerSecret = mpesaConsumerSecret
    }
    if (mpesaPasskey !== undefined && mpesaPasskey !== '' && !mpesaPasskey.includes('••••')) {
      updateData.mpesaPasskey = mpesaPasskey
    }
    if (mpesaShortcode !== undefined) updateData.mpesaShortcode = mpesaShortcode
    if (mpesaConfirmationUrl !== undefined) updateData.mpesaConfirmationUrl = mpesaConfirmationUrl
    if (mpesaValidationUrl !== undefined) updateData.mpesaValidationUrl = mpesaValidationUrl
    if (mpesaCallbackUrl !== undefined) updateData.mpesaCallbackUrl = mpesaCallbackUrl
    if (mpesaEnvironment !== undefined) updateData.mpesaEnvironment = mpesaEnvironment
    if (mpesaEnabled !== undefined) updateData.mpesaEnabled = mpesaEnabled

    // HostPinnacle Configuration
    if (hostpinnacleBaseUrl !== undefined) updateData.hostpinnacleBaseUrl = hostpinnacleBaseUrl
    if (hostpinnacleUserId !== undefined && hostpinnacleUserId !== '' && !hostpinnacleUserId.includes('••••')) {
      updateData.hostpinnacleUserId = hostpinnacleUserId
    }
    if (hostpinnaclePassword !== undefined && hostpinnaclePassword !== '' && !hostpinnaclePassword.includes('••••')) {
      updateData.hostpinnaclePassword = hostpinnaclePassword
    }
    if (hostpinnacleApiKey !== undefined && hostpinnacleApiKey !== '' && !hostpinnacleApiKey.includes('••••')) {
      updateData.hostpinnacleApiKey = hostpinnacleApiKey
    }
    if (hostpinnacleStatusEndpoint !== undefined) updateData.hostpinnacleStatusEndpoint = hostpinnacleStatusEndpoint
    if (hostpinnacleTimeout !== undefined) updateData.hostpinnacleTimeout = hostpinnacleTimeout
    if (hostpinnacleSmsSendTimeout !== undefined) updateData.hostpinnacleSmsSendTimeout = hostpinnacleSmsSendTimeout
    if (hostpinnacleStatusTimeout !== undefined) updateData.hostpinnacleStatusTimeout = hostpinnacleStatusTimeout

    // Update or create settings
    if (settings) {
      Object.assign(settings, updateData)
      await settings.save()
    } else {
      settings = await SystemSettings.create(updateData)
    }

    // Track changes for audit log
    const changes: Record<string, any> = {}
    if (before) {
      Object.keys(updateData).forEach((key) => {
        if (key !== 'updatedBy' && before[key] !== updateData[key]) {
          changes[key] = {
            before: before[key],
            after: updateData[key],
          }
        }
      })
    } else {
      // New settings created
      Object.keys(updateData).forEach((key) => {
        if (key !== 'updatedBy') {
          changes[key] = { before: null, after: updateData[key] }
        }
      })
    }

    // Clear HostPinnacle settings cache so new settings are used immediately
    clearHostPinnacleSettingsCache()

    // Log audit
    await logAudit(
      'UPDATE',
      'system_settings',
      user.userId,
      user.email,
      {
        changes,
        request,
      }
    )

    // Return updated settings (masked credentials)
    const settingsObj = settings.toObject()
    if (settingsObj.providerApiKey) {
      const masked = settingsObj.providerApiKey.length > 8 
        ? settingsObj.providerApiKey.substring(0, 4) + '••••••••' + settingsObj.providerApiKey.substring(settingsObj.providerApiKey.length - 4)
        : '••••••••'
      settingsObj.providerApiKey = masked
    }

    // Mask M-Pesa credentials
    const maskValue = (value: string | undefined) => {
      if (!value) return undefined
      return value.length > 8 
        ? value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
        : '••••••••'
    }

    if (settingsObj.mpesaConsumerKey) {
      settingsObj.mpesaConsumerKey = maskValue(settingsObj.mpesaConsumerKey)
    }
    if (settingsObj.mpesaConsumerSecret) {
      settingsObj.mpesaConsumerSecret = maskValue(settingsObj.mpesaConsumerSecret)
    }
    if (settingsObj.mpesaPasskey) {
      settingsObj.mpesaPasskey = maskValue(settingsObj.mpesaPasskey)
    }

    // Mask HostPinnacle credentials
    if (settingsObj.hostpinnacleUserId) {
      settingsObj.hostpinnacleUserId = maskValue(settingsObj.hostpinnacleUserId)
    }
    if (settingsObj.hostpinnaclePassword) {
      settingsObj.hostpinnaclePassword = maskValue(settingsObj.hostpinnaclePassword)
    }
    if (settingsObj.hostpinnacleApiKey) {
      settingsObj.hostpinnacleApiKey = maskValue(settingsObj.hostpinnacleApiKey)
    }

    return NextResponse.json({
      success: true,
      data: settingsObj,
      message: 'Settings updated successfully',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401 }
      )
    }
    console.error('Settings POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


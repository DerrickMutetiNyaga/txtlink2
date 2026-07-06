/**
 * Health check endpoint for the Render web service.
 * GET /api/health
 *
 * Used by Render's health check (healthCheckPath) to verify the service is
 * up and can reach MongoDB.
 */

import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db/connect'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    const dbState = mongoose.connection.readyState // 1 = connected

    if (dbState !== 1) {
      return NextResponse.json(
        { status: 'degraded', database: 'disconnected' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error.message || 'Health check failed' },
      { status: 503 }
    )
  }
}

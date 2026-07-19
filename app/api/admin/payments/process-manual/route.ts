/**
 * Deprecated — manual payment processing is super-admin (owner) only.
 * POST /api/admin/payments/process-manual
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Forbidden: Manual payment processing is restricted to super admins. Use POST /api/super-admin/payments/process-manual',
    },
    { status: 403 }
  )
}

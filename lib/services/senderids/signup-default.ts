/**
 * Auto-assign the configured default sender ID when a new user signs up.
 */

import { SystemSettings } from '@/lib/db/models'
import { assignSenderIdToUser } from './assign-to-user'

export async function assignSignupDefaultSenderId(userId: string): Promise<boolean> {
  try {
    const settings = await SystemSettings.findOne().lean()
    if (!settings?.autoAssignSenderIdOnSignup || !settings.signupDefaultSenderId) {
      return false
    }

    await assignSenderIdToUser({
      userId,
      senderId: settings.signupDefaultSenderId.toString(),
      makeDefault: true,
    })

    return true
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    if (err.code === 'ALREADY_ASSIGNED') {
      return false
    }
    console.error('[signup] Failed to auto-assign default sender ID:', err.message || error)
    return false
  }
}

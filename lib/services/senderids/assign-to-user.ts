/**
 * Assign a sender ID to a user account. Same sender ID can be shared across users.
 */

import mongoose from 'mongoose'
import { SenderId, User, UserSenderId } from '@/lib/db/models'
import { ensureSharedSenderIdIndexes, isLegacySenderIdUniqueError } from './ensure-shared-indexes'

export interface AssignSenderIdToUserParams {
  userId: string
  senderId?: string
  senderName?: string
  makeDefault?: boolean
}

export interface AssignSenderIdToUserResult {
  userSenderIdId: string
  senderId: string
  senderName: string
  status: string
  isDefault: boolean
}

function isValidObjectId(str: string): boolean {
  return mongoose.Types.ObjectId.isValid(str) && str.length === 24
}

async function resolveSenderIdObject(params: {
  senderId?: string
  senderName?: string
}): Promise<{ _id: mongoose.Types.ObjectId; senderName: string; status: string }> {
  const { senderId, senderName } = params
  const actualSenderName =
    senderName || (senderId && !isValidObjectId(senderId) ? senderId : null)
  const actualSenderId = senderId && isValidObjectId(senderId) ? senderId : null

  if (actualSenderId) {
    const doc = await SenderId.findById(actualSenderId)
    if (!doc) throw new Error('Sender ID not found')
    return doc
  }

  if (!actualSenderName) {
    throw new Error('senderId or senderName is required')
  }

  let existing = await SenderId.findOne({ senderName: actualSenderName })
  if (!existing) {
    existing = await SenderId.findOne({
      senderName: {
        $regex: new RegExp(
          `^${actualSenderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      },
    })
  }

  if (existing) {
    if (existing.senderName !== actualSenderName) {
      existing.senderName = actualSenderName
      await existing.save()
    }
    return existing
  }

  try {
    return await SenderId.create({
      senderName: actualSenderName,
      provider: 'hostpinnacle',
      status: 'active',
    })
  } catch (createError: unknown) {
    const err = createError as { code?: number }
    if (err.code === 11000) {
      const doc = await SenderId.findOne({ senderName: actualSenderName })
      if (doc) return doc
    }
    throw createError
  }
}

async function createAssignment(params: {
  userObjectId: mongoose.Types.ObjectId
  senderIdObject: { _id: mongoose.Types.ObjectId; senderName: string; status: string }
  makeDefault?: boolean
}): Promise<AssignSenderIdToUserResult> {
  const { userObjectId, senderIdObject, makeDefault } = params

  const existingAssignment = await UserSenderId.findOne({
    userId: userObjectId,
    senderId: senderIdObject._id,
  })
  if (existingAssignment) {
    throw Object.assign(new Error('Sender ID is already assigned to this user'), {
      code: 'ALREADY_ASSIGNED',
    })
  }

  const userSenderIdCount = await UserSenderId.countDocuments({ userId: userObjectId })
  const shouldBeDefault = makeDefault || userSenderIdCount === 0

  if (shouldBeDefault) {
    await UserSenderId.updateMany({ userId: userObjectId }, { isDefault: false })
  }

  const userSenderId = await UserSenderId.create({
    userId: userObjectId,
    senderId: senderIdObject._id,
    isDefault: shouldBeDefault,
  })

  return {
    userSenderIdId: userSenderId._id.toString(),
    senderId: senderIdObject._id.toString(),
    senderName: senderIdObject.senderName,
    status: senderIdObject.status,
    isDefault: userSenderId.isDefault,
  }
}

export async function assignSenderIdToUser(
  params: AssignSenderIdToUserParams
): Promise<AssignSenderIdToUserResult> {
  await ensureSharedSenderIdIndexes()

  const userObjectId = new mongoose.Types.ObjectId(params.userId)
  const user = await User.findById(userObjectId)
  if (!user) {
    throw new Error('User not found')
  }

  const senderIdObject = await resolveSenderIdObject(params)

  try {
    return await createAssignment({
      userObjectId,
      senderIdObject,
      makeDefault: params.makeDefault,
    })
  } catch (error) {
    if (isLegacySenderIdUniqueError(error)) {
      await ensureSharedSenderIdIndexes()
      return createAssignment({
        userObjectId,
        senderIdObject,
        makeDefault: params.makeDefault,
      })
    }
    throw error
  }
}

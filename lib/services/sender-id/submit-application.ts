import mongoose from 'mongoose'
import { Invoice, SenderIdRequest } from '@/lib/db/models'
import { getSenderIdApplicationFeeKes } from '@/lib/services/sender-id/application-fee'
import { formatInvoice, formatSenderIdRequest } from '@/lib/validation/sender-id-request'

interface SubmitSenderIdApplicationInput {
  userId: mongoose.Types.ObjectId
  data: Record<string, unknown>
}

export async function submitSenderIdApplication({
  userId,
  data,
}: SubmitSenderIdApplicationInput) {
  const desiredSenderId = data.desiredSenderId as string
  const workspaceId = userId

  const existingPending = await SenderIdRequest.findOne({
    userId,
    desiredSenderId,
    status: 'payment_pending',
  }).lean()

  if (existingPending?.invoiceId) {
    const existingInvoice = await Invoice.findById(existingPending.invoiceId).lean()
    if (existingInvoice && ['unpaid', 'failed', 'pending_payment'].includes(existingInvoice.status)) {
      const err = new Error('An unpaid application already exists for this Sender ID') as Error & {
        statusCode?: number
        existingInvoiceId?: string
        existingRequestId?: string
      }
      err.statusCode = 409
      err.existingInvoiceId = existingInvoice._id?.toString()
      err.existingRequestId = existingPending._id?.toString()
      throw err
    }
  }

  const feeAmount = await getSenderIdApplicationFeeKes()

  const request = await SenderIdRequest.create({
    userId,
    workspaceId,
    ...data,
    status: 'payment_pending',
  })

  const invoice = await Invoice.create({
    userId,
    workspaceId,
    type: 'sender_id_application',
    description: 'Sender ID Application Fee',
    amount: feeAmount,
    currency: 'KES',
    status: 'unpaid',
    senderIdRequestId: request._id,
  })

  request.invoiceId = invoice._id as mongoose.Types.ObjectId
  await request.save()

  return {
    request: formatSenderIdRequest(request),
    invoice: formatInvoice(invoice, desiredSenderId),
    feeAmount,
  }
}

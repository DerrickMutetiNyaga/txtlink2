import mongoose from 'mongoose'
import {
  Invoice,
  MpesaTransaction,
  SenderIdRequest,
  Transaction,
} from '@/lib/db/models'

interface CompleteInvoicePaymentInput {
  mpesaTransaction: InstanceType<typeof MpesaTransaction>
  mpesaReceiptNumber?: string
  checkoutRequestId?: string
}

export async function completeSenderIdInvoicePayment({
  mpesaTransaction,
  mpesaReceiptNumber,
  checkoutRequestId,
}: CompleteInvoicePaymentInput): Promise<void> {
  if (!mpesaTransaction.billingInvoiceId) {
    throw new Error('Missing billing invoice reference on M-Pesa transaction')
  }

  const invoice = await Invoice.findById(mpesaTransaction.billingInvoiceId)
  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status === 'paid') {
    return
  }

  const reference = mpesaReceiptNumber || `MPESA-${Date.now()}`
  const paidAt = new Date()

  invoice.status = 'paid'
  invoice.paidAt = paidAt
  invoice.mpesaReceiptNumber = mpesaReceiptNumber
  invoice.paymentReference = reference
  if (checkoutRequestId) {
    invoice.mpesaCheckoutRequestId = checkoutRequestId
  }
  await invoice.save()

  if (invoice.senderIdRequestId) {
    await SenderIdRequest.findByIdAndUpdate(invoice.senderIdRequestId, {
      status: 'under_review',
    })
  }

  const existingTransaction = await Transaction.findOne({ reference })
  if (!existingTransaction && mpesaTransaction.userId) {
    await Transaction.create({
      userId: mpesaTransaction.userId,
      type: 'charge',
      amount: -Math.abs(invoice.amount),
      description: invoice.description,
      reference,
      status: 'completed',
      metadata: {
        currency: invoice.currency,
        invoiceId: invoice._id?.toString(),
        senderIdRequestId: invoice.senderIdRequestId?.toString(),
        paymentType: 'sender_id_application',
        mpesaReceiptNumber,
        checkoutRequestId,
      },
    })
  }

  mpesaTransaction.invoiceId = reference
  await mpesaTransaction.save()
}

export async function markInvoicePaymentFailed(
  billingInvoiceId: mongoose.Types.ObjectId | string | undefined,
  failureReason?: string
): Promise<void> {
  if (!billingInvoiceId) return

  const invoice = await Invoice.findById(billingInvoiceId)
  if (!invoice || invoice.status === 'paid') return

  invoice.status = 'failed'
  invoice.failedAt = new Date()
  invoice.failureReason = failureReason
  await invoice.save()
}

import { eq, and, ne } from 'drizzle-orm'
import { db } from '../config/db'
import { invoices } from '../db/schema/invoices'
import { paymentEvents } from '../db/schema/financials'
import { stripe } from '../config/stripe'
import { AppError } from '../utils/errors'
import { StorageService } from './storage.service'
import { NotificationService } from './notification.service'
import { formatAUD } from '../utils/currency'

export type PaymentEventSource = 'client' | 'webhook' | 'reconciliation' | 'offline_sync'
export type PaymentEventType =
  | 'payment_intent_created'
  | 'client_confirmed'
  | 'webhook_succeeded'
  | 'webhook_failed'
  | 'offline_cash_recorded'
  | 'reconciliation'

export class PaymentService {
  static async recordEvent(params: {
    invoiceId: string
    tradieId: string
    eventType: PaymentEventType
    source: PaymentEventSource
    stripePaymentIntentId?: string | null
    metadata?: Record<string, unknown>
  }) {
    await db.insert(paymentEvents).values({
      invoiceId: params.invoiceId,
      tradieId: params.tradieId,
      eventType: params.eventType,
      source: params.source,
      stripePaymentIntentId: params.stripePaymentIntentId ?? null,
      metadata: params.metadata ?? null,
      createdAt: new Date(),
    })
  }

  static async markInvoicePaid(params: {
    invoiceId: string
    tradieId: string
    paymentMethod: 'STRIPE_TAP_TO_PAY' | 'CASH' | 'STRIPE_CARD'
    stripePaymentIntentId?: string | null
    signatureData?: string | null
    source: PaymentEventSource
    eventType: PaymentEventType
  }) {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, params.invoiceId), eq(invoices.tradieId, params.tradieId)))
      .limit(1)

    if (!invoice) {
      throw new AppError('Invoice not found or access denied', 404, 'INVOICE_NOT_FOUND')
    }

    if (invoice.status === 'PAID') {
      return invoice
    }

    let signatureUrl: string | null = invoice.signatureUrl ?? null
    if (params.signatureData) {
      signatureUrl = await StorageService.uploadSignature(
        params.tradieId,
        params.invoiceId,
        params.signatureData
      )
    }

    const [updated] = await db
      .update(invoices)
      .set({
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: params.paymentMethod,
        stripePaymentIntentId: params.stripePaymentIntentId ?? invoice.stripePaymentIntentId,
        paidCents: invoice.totalCents,
        signatureData: params.signatureData ?? invoice.signatureData,
        signatureUrl,
        signedAt: params.signatureData ? new Date() : invoice.signedAt,
        updatedAt: new Date(),
      })
      // Guard against the client confirm and the Stripe webhook racing each
      // other: only the request that actually flips the status continues.
      .where(and(eq(invoices.id, params.invoiceId), ne(invoices.status, 'PAID')))
      .returning()

    if (!updated) {
      const [current] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, params.invoiceId))
        .limit(1)
      return current
    }

    await this.recordEvent({
      invoiceId: params.invoiceId,
      tradieId: params.tradieId,
      eventType: params.eventType,
      source: params.source,
      stripePaymentIntentId: params.stripePaymentIntentId,
    })

    // Cash is recorded by the tradie themselves, so only card payments need a push.
    if (params.paymentMethod !== 'CASH') {
      await NotificationService.notifyTradie(params.tradieId, {
        type: 'PAYMENT_RECEIVED',
        title: 'Payment received',
        body: `${formatAUD(updated.totalCents)} paid for ${updated.invoiceNumber}`,
        data: { invoiceId: updated.id, invoiceNumber: updated.invoiceNumber },
      })
    }

    return updated
  }

  static async confirmStripePayment(tradieId: string, invoiceId: string, paymentIntentId: string) {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tradieId, tradieId)))
      .limit(1)

    if (!invoice) {
      throw new AppError('Invoice not found or access denied', 404, 'INVOICE_NOT_FOUND')
    }

    if (invoice.status === 'PAID') {
      return { invoice, alreadyPaid: true }
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const metadataInvoiceId = paymentIntent.metadata.invoiceId ?? paymentIntent.metadata.invoice_id

    if (metadataInvoiceId && metadataInvoiceId !== invoiceId) {
      throw new AppError('PaymentIntent does not match this invoice.', 400, 'PAYMENT_MISMATCH')
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(
        `Payment is not complete. Current status: ${paymentIntent.status}`,
        400,
        'PAYMENT_NOT_COMPLETE'
      )
    }

    const updated = await this.markInvoicePaid({
      invoiceId,
      tradieId,
      paymentMethod: 'STRIPE_TAP_TO_PAY',
      stripePaymentIntentId: paymentIntentId,
      source: 'client',
      eventType: 'client_confirmed',
    })

    return { invoice: updated, alreadyPaid: false }
  }
}

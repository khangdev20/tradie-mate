import { FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { env } from '../../config/env'
import { stripe } from '../../config/stripe'
import { db } from '../../config/db'
import { invoices } from '../../db/schema/invoices'
import { tradieSubscriptions } from '../../db/schema/subscriptions'
import { redis } from '../../utils/redis'
import { PaymentService } from '../../services/payment.service'
import { upsertTradieSubscription } from '../../services/billing-webhook.service'

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 72 // 72 hours

async function isEventProcessed(eventId: string): Promise<boolean> {
  const key = `stripe:event:${eventId}`
  const exists = await redis.get(key)
  return exists === '1'
}

async function markEventProcessed(eventId: string): Promise<void> {
  const key = `stripe:event:${eventId}`
  await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS)
}

export async function stripeWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const sig = request.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      ((request as any).rawBody ?? request.body) as string | Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    return reply.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (await isEventProcessed(event.id)) {
      return reply.status(200).send({
        success: true,
        data: { received: true, duplicate: true },
      })
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break
      }
      case 'payment_intent.payment_failed':
        console.warn('Payment failed:', (event.data.object as Stripe.PaymentIntent).id)
        break
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        if (event.type === 'customer.subscription.deleted') {
          await db
            .update(tradieSubscriptions)
            .set({ status: 'CANCELED', updatedAt: new Date() })
            .where(eq(tradieSubscriptions.stripeSubscriptionId, (event.data.object as Stripe.Subscription).id))
        } else {
          await upsertTradieSubscription(event.data.object as Stripe.Subscription)
        }
        break
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await handleBillingInvoice(event.data.object as Stripe.Invoice, event.type)
        break
      default:
        break
    }

    await markEventProcessed(event.id)
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return reply.status(500).send({
      success: false,
      error: {
        statusCode: 500,
        code: 'STRIPE_WEBHOOK_PROCESSING_FAILED',
        message: 'Stripe webhook processing failed.',
      },
    })
  }

  return reply.status(200).send({
    success: true,
    data: { received: true },
  })
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoiceId ?? paymentIntent.metadata.invoice_id
  if (!invoiceId) return

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invoice) return

  if (invoice.status === 'PAID') {
    await PaymentService.recordEvent({
      invoiceId,
      tradieId: invoice.tradieId,
      eventType: 'webhook_succeeded',
      source: 'webhook',
      stripePaymentIntentId: paymentIntent.id,
      metadata: { duplicate: true },
    })
    return
  }

  await PaymentService.markInvoicePaid({
    invoiceId,
    tradieId: invoice.tradieId,
    paymentMethod: 'STRIPE_TAP_TO_PAY',
    stripePaymentIntentId: paymentIntent.id,
    source: 'webhook',
    eventType: 'webhook_succeeded',
  })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription || typeof session.subscription !== 'string') return

  const subscription = await stripe.subscriptions.retrieve(session.subscription)
  await upsertTradieSubscription(subscription, {
    tradieId: session.metadata?.tradieId,
    planCode: session.metadata?.planCode,
  })
}

async function handleBillingInvoice(invoice: Stripe.Invoice, eventType: string) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
  if (!subscriptionId) return

  const status: SubscriptionStatus =
    eventType === 'invoice.payment_failed' ? 'PAST_DUE' : 'ACTIVE'

  await db
    .update(tradieSubscriptions)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(tradieSubscriptions.stripeSubscriptionId, subscriptionId))
}

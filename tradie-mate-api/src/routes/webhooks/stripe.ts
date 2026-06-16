import { FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { env } from '../../config/env'
import { stripe } from '../../config/stripe'
import { db } from '../../config/db'
import { invoices } from '../../db/schema/invoices'
import { subscriptionPlans, tradieSubscriptions } from '../../db/schema/subscriptions'
import { redis } from '../../utils/redis'

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
        await upsertSubscription(event.data.object as Stripe.Subscription)
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

  await db
    .update(invoices)
    .set({
      status: 'PAID',
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))

  // Queue Xero sync (BullMQ) - placeholder
  // xeroQueue.add('sync-invoice', { invoiceId })

  // Send FCM push
  // notificationService.sendPaymentReceived(invoiceId)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription || typeof session.subscription !== 'string') return

  const subscription = await stripe.subscriptions.retrieve(session.subscription)
  await upsertSubscription(subscription, {
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

async function upsertSubscription(
  subscription: Stripe.Subscription,
  fallback?: { tradieId?: string | null; planCode?: string | null }
) {
  const subscriptionAny = subscription as any
  const stripeSubscriptionId = subscription.id
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const priceId = subscription.items.data[0]?.price.id
  const metadata = subscription.metadata ?? {}

  const planCode = metadata.planCode ?? fallback?.planCode ?? (await getPlanCodeForPrice(priceId))
  const tradieId = metadata.tradieId ?? fallback?.tradieId ?? (await getTradieIdForCustomer(stripeCustomerId))
  if (!planCode || !tradieId) return

  const values = {
    tradieId,
    planCode,
    status: mapStripeSubscriptionStatus(subscription.status),
    stripeCustomerId,
    stripeSubscriptionId,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    currentPeriodStart: subscriptionAny.current_period_start
      ? new Date(subscriptionAny.current_period_start * 1000)
      : null,
    currentPeriodEnd: subscriptionAny.current_period_end
      ? new Date(subscriptionAny.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  }

  const [existing] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1)

  if (existing) {
    await db
      .update(tradieSubscriptions)
      .set(values)
      .where(eq(tradieSubscriptions.id, existing.id))
    return
  }

  await db.insert(tradieSubscriptions).values(values)
}

async function getPlanCodeForPrice(priceId?: string) {
  if (!priceId) return null

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.stripePriceId, priceId))
    .limit(1)

  return plan?.code ?? null
}

async function getTradieIdForCustomer(stripeCustomerId: string) {
  const [subscription] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1)

  return subscription?.tradieId ?? null
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING'
    case 'active':
      return 'ACTIVE'
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE'
    case 'canceled':
      return 'CANCELED'
    default:
      return 'INCOMPLETE'
  }
}

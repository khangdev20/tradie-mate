import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { env } from '../../config/env'
import { db } from '../../config/db'
import { invoices } from '../../db/schema/invoices'
import { tradieSubscriptions } from '../../db/schema/subscriptions'
import { redis } from '../../utils/redis'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)

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
      request.body as string | Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    return reply.status(400).send(`Webhook Error: ${err.message}`)
  }

  reply.status(200).send({ received: true })

  try {
    if (await isEventProcessed(event.id)) {
      return
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break
      case 'payment_intent.payment_failed':
        console.warn('Payment failed:', (event.data.object as Stripe.PaymentIntent).id)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        break
    }

    await markEventProcessed(event.id)
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoiceId || paymentIntent.metadata.invoice_id
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
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const tradieId = subscription.metadata.tradieId
  if (!tradieId) return

  const planCode = subscription.metadata.planCode || 'SOLO_STARTER'
  const statusMap: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'> = {
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    incomplete: 'INCOMPLETE',
    unpaid: 'PAST_DUE',
  }

  const mappedStatus = statusMap[subscription.status] ?? 'INCOMPLETE'

  const [existing] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.tradieId, tradieId))
    .limit(1)

  const periodStart = new Date((subscription.current_period_start ?? 0) * 1000)
  const periodEnd = new Date((subscription.current_period_end ?? 0) * 1000)

  if (existing) {
    await db
      .update(tradieSubscriptions)
      .set({
        planCode,
        status: mappedStatus,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(tradieSubscriptions.tradieId, tradieId))
  } else {
    await db.insert(tradieSubscriptions).values({
      tradieId,
      planCode,
      status: mappedStatus,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tradieId = subscription.metadata.tradieId
  if (!tradieId) return

  await db
    .update(tradieSubscriptions)
    .set({
      status: 'CANCELED',
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(tradieSubscriptions.tradieId, tradieId))
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | null
  if (!subscriptionId) return

  const [sub] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1)

  if (sub) {
    await db
      .update(tradieSubscriptions)
      .set({ status: 'PAST_DUE', updatedAt: new Date() })
      .where(eq(tradieSubscriptions.id, sub.id))
  }
}

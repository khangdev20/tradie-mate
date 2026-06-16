import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '../config/db'
import { tradieSubscriptions, subscriptionPlans } from '../db/schema/subscriptions'
import { redis } from '../utils/redis'

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 72

export async function isBillingEventProcessed(eventId: string): Promise<boolean> {
  const key = `stripe:billing:event:${eventId}`
  return (await redis.get(key)) === '1'
}

export async function markBillingEventProcessed(eventId: string): Promise<void> {
  const key = `stripe:billing:event:${eventId}`
  await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS)
}

export async function upsertTradieSubscription(
  subscription: Stripe.Subscription,
  fallback?: { tradieId?: string | null; planCode?: string | null }
) {
  const subscriptionAny = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
    trial_end?: number | null
  }

  const stripeSubscriptionId = subscription.id
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const priceId = subscription.items.data[0]?.price.id
  const metadata = subscription.metadata ?? {}

  const planCode = metadata.planCode ?? metadata.plan_code ?? fallback?.planCode ?? (await getPlanCodeForPrice(priceId))
  const tradieId =
    metadata.tradieId ?? metadata.tradie_id ?? fallback?.tradieId ?? (await getTradieIdForCustomer(stripeCustomerId))

  if (!planCode || !tradieId) {
    console.warn(
      `[billing] Could not resolve tradie/plan for customer=${stripeCustomerId} sub=${stripeSubscriptionId}`
    )
    return false
  }

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

  const [existingBySub] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1)

  if (existingBySub) {
    await db.update(tradieSubscriptions).set(values).where(eq(tradieSubscriptions.id, existingBySub.id))
    return true
  }

  const [existingByTradie] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.tradieId, tradieId))
    .limit(1)

  if (existingByTradie) {
    await db.update(tradieSubscriptions).set(values).where(eq(tradieSubscriptions.id, existingByTradie.id))
    return true
  }

  await db.insert(tradieSubscriptions).values(values)
  return true
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

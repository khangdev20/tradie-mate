import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requireOnboarded } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { subscriptionPlans, planEntitlements, tradieSubscriptions } from '../../db/schema/subscriptions'
import { eq } from 'drizzle-orm'
import { EntitlementService } from '../../services/entitlement.service'
import { StripeService } from '../../services/stripe.service'
import { AppError } from '../../utils/errors'

function entitlementsToFeatures(entitlements: Record<string, unknown>): string[] {
  const features: string[] = []
  if (typeof entitlements.maxJobsPerMonth === 'number') {
    features.push(`${entitlements.maxJobsPerMonth} jobs/month`)
  }
  if (typeof entitlements.maxInvoicesPerMonth === 'number') {
    features.push(`${entitlements.maxInvoicesPerMonth} invoices/month`)
  }
  if (entitlements.tapToPayEnabled) features.push('Tap to Pay')
  if (entitlements.customerTrackingEnabled) features.push('Customer live tracking')
  if (entitlements.reviewRequestsEnabled) features.push('Review requests')
  if (entitlements.xeroSyncEnabled) features.push('Xero sync')
  if (typeof entitlements.teamMembersLimit === 'number' && entitlements.teamMembersLimit > 1) {
    features.push(`Up to ${entitlements.teamMembersLimit} team members`)
  }
  features.push('Offline sync')
  return features
}

async function linkStripeCustomer(tradieId: string, stripeCustomerId: string) {
  const [existing] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.tradieId, tradieId))
    .limit(1)

  if (existing) {
    await db
      .update(tradieSubscriptions)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(tradieSubscriptions.id, existing.id))
    return
  }

  await db.insert(tradieSubscriptions).values({
    tradieId,
    planCode: 'FREE',
    status: 'INCOMPLETE',
    stripeCustomerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export async function billingRoutes(fastify: FastifyInstance) {
  // Public route to fetch subscription plans
  fastify.get('/plans', async () => {
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isPublic, true))
      .orderBy(subscriptionPlans.sortOrder)

    const planEntRows = await db.select().from(planEntitlements)
    const entByPlan = Object.fromEntries(
      planEntRows.map((row) => [row.planCode, row.entitlements as Record<string, unknown>])
    )

    const plansWithFeatures = plans.map((plan) => ({
      ...plan,
      features: entitlementsToFeatures(entByPlan[plan.code] ?? {}),
    }))

    return {
      success: true,
      data: { plans: plansWithFeatures },
    }
  })

  // Protected routes
  const protectedGroup = fastify.register(async (instance) => {
    instance.addHook('preHandler', requireAuth)
    instance.addHook('preHandler', requireOnboarded)

    // 1. Get current subscription, entitlements, and usage limits
    instance.get('/subscription', async (request) => {
      const tradieId = request.tradie.id
      const effective = await EntitlementService.getEffectiveEntitlements(tradieId)

      // Fetch usage counts for current period
      const jobsCount = await EntitlementService.getUsageCount(
        tradieId,
        'jobsCreated',
        effective.currentPeriodStart,
        effective.currentPeriodEnd
      )
      const invoicesCount = await EntitlementService.getUsageCount(
        tradieId,
        'invoicesCreated',
        effective.currentPeriodStart,
        effective.currentPeriodEnd
      )

      return {
        success: true,
        data: {
          status: effective.status,
          planCode: effective.planCode,
          currentPeriodEnd: effective.currentPeriodEnd,
          entitlements: effective.entitlements,
          usage: {
            jobsCreated: jobsCount,
            invoicesCreated: invoicesCount,
          },
        },
      }
    })

    // 2. Start Checkout session
    instance.post('/checkout-session', async (request: FastifyRequest<{
      Body: { planCode: string; successUrl: string; cancelUrl: string }
    }>) => {
      const { planCode, successUrl, cancelUrl } = request.body
      const tradie = request.tradie

      if (!planCode || !successUrl || !cancelUrl) {
        throw new AppError('Plan code, success URL, and cancel URL are required.', 400)
      }

      // Fetch plan price ID
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.code, planCode))
        .limit(1)

      if (!plan) {
        throw new AppError('Plan not found', 404)
      }

      // Get or create Stripe Customer
      const stripeCustomerId = await StripeService.getOrCreateCustomer(
        tradie.email || `${tradie.id}@tradiemate.com.au`,
        `${tradie.firstName} ${tradie.lastName}`
      )

      await linkStripeCustomer(tradie.id, stripeCustomerId)

      const checkoutUrl = await StripeService.createCheckoutSession(
        plan.stripePriceId,
        stripeCustomerId,
        successUrl,
        cancelUrl,
        { tradieId: tradie.id, planCode }
      )

      return {
        success: true,
        data: { checkoutUrl },
      }
    })

    // 3. Create Stripe Billing Portal redirection
    instance.post('/portal-session', async (request: FastifyRequest<{
      Body: { returnUrl?: string } | undefined
    }>) => {
      const { returnUrl } = request.body ?? {}
      const tradie = request.tradie

      // Get or create Stripe Customer
      const stripeCustomerId = await StripeService.getOrCreateCustomer(
        tradie.email || `${tradie.id}@tradiemate.com.au`,
        `${tradie.firstName} ${tradie.lastName}`
      )

      await linkStripeCustomer(tradie.id, stripeCustomerId)

      const portalUrl = await StripeService.createPortalSession(
        stripeCustomerId,
        returnUrl ?? 'tradiemate://billing'
      )

      return {
        success: true,
        data: { portalUrl },
      }
    })
  })
}

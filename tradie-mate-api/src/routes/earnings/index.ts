import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { invoices } from '../../db/schema/invoices'
import { payouts } from '../../db/schema/financials'
import { tradies } from '../../db/schema/tradies'
import { eq, and, gte, lt, sql, sum, count } from 'drizzle-orm'
import { AppError } from '../../utils/errors'
import { stripe } from '../../config/stripe'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const SYDNEY_TZ = 'Australia/Sydney'

export async function earningsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  /**
   * GET /api/v1/earnings/stats?period=week|month|year
   * Module 3.1 — Returns earnings statistics and chart data for the given period.
   */
  fastify.get<{
    Querystring: { period?: 'week' | 'month' | 'year' }
  }>('/stats', async (request) => {
    const { period = 'month' } = request.query
    const tradieId = request.tradie.id

    // Compute period start/end in UTC using Sydney local time as reference
    const nowUtc = new Date()
    const nowSydney = toZonedTime(nowUtc, SYDNEY_TZ)

    let periodStart: Date
    let periodEnd: Date
    let chartLabels: string[] = []

    switch (period) {
      case 'week':
        periodStart = startOfWeek(nowSydney, { weekStartsOn: 1 }) // Monday start
        periodEnd = endOfWeek(nowSydney, { weekStartsOn: 1 })
        chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        break
      case 'year':
        periodStart = startOfYear(nowSydney)
        periodEnd = endOfYear(nowSydney)
        chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        break
      case 'month':
      default:
        periodStart = startOfMonth(nowSydney)
        periodEnd = endOfMonth(nowSydney)
        // Build day-by-day labels for current month
        const daysInMonth = periodEnd.getDate()
        chartLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1))
        break
    }

    // Fetch all PAID invoices for the period
    const paidInvoices = await db
      .select({
        totalCents: invoices.totalCents,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tradieId, tradieId),
          eq(invoices.status, 'PAID'),
          gte(invoices.paidAt as any, periodStart),
          lt(invoices.paidAt as any, periodEnd),
        )
      )

    const totalEarned = paidInvoices.reduce((acc, inv) => acc + (inv.totalCents ?? 0), 0)
    const jobsCount = paidInvoices.length
    const avgJobValue = jobsCount > 0 ? Math.round(totalEarned / jobsCount) : 0

    // Aggregate chart data
    const chartMap: Record<string, number> = {}
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue
      const sydneyDate = toZonedTime(new Date(inv.paidAt), SYDNEY_TZ)
      let key: string

      if (period === 'week') {
        key = format(sydneyDate, 'EEE').slice(0, 3) // Mon, Tue...
      } else if (period === 'year') {
        key = format(sydneyDate, 'MMM') // Jan, Feb...
      } else {
        key = String(sydneyDate.getDate()) // 1, 2, 3...
      }

      chartMap[key] = (chartMap[key] ?? 0) + (inv.totalCents ?? 0)
    }

    const chartData = chartLabels.map((label) => ({
      label,
      amount: chartMap[label] ?? 0,
    }))

    // Pending payout — sum of unpaid invoices
    const [unpaidResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${invoices.totalCents}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.tradieId, tradieId), eq(invoices.status, 'SENT')))

    const pendingPayout = Number(unpaidResult?.total ?? 0)

    return {
      success: true,
      data: {
        period,
        totalEarned,
        jobsCount,
        avgJobValue,
        pendingPayout,
        chartData,
      },
    }
  })

  /**
   * POST /api/v1/earnings/payouts
   * Module 3.1 — Request an instant payout via Stripe Connect.
   */
  fastify.post('/payouts', async (request, reply) => {
    const tradieId = request.tradie.id

    // Look up tradie's Stripe Connect account ID
    const [tradie] = await db
      .select({
        id: tradies.id,
        firstName: tradies.firstName,
        lastName: tradies.lastName,
        stripeConnectAccountId: tradies.stripeConnectAccountId,
      })
      .from(tradies)
      .where(eq(tradies.id, tradieId))
      .limit(1)

    if (!tradie) {
      throw new AppError('Tradie not found.', 404, 'NOT_FOUND')
    }

    const stripeAccountId = tradie.stripeConnectAccountId || process.env.STRIPE_AU_ACCOUNT_ID
    if (!stripeAccountId) {
      throw new AppError(
        'Stripe Connect account not configured for this tradie.',
        400,
        'STRIPE_CONNECT_NOT_CONFIGURED'
      )
    }

    // Retrieve available balance from Stripe Connect
    let availableBalance = 0
    try {
      const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId })
      const audBalance = balance.available.find((b) => b.currency === 'aud')
      availableBalance = audBalance?.amount ?? 0
    } catch (stripeErr: any) {
      throw new AppError(stripeErr.message || 'Failed to retrieve Stripe balance.', 502, 'STRIPE_ERROR')
    }

    if (availableBalance <= 0) {
      throw new AppError('No available balance for payout.', 400, 'INSUFFICIENT_BALANCE')
    }

    // Create Stripe payout
    let stripePayout: any
    try {
      stripePayout = await stripe.payouts.create(
        {
          amount: availableBalance,
          currency: 'aud',
          method: 'instant',
        },
        { stripeAccount: stripeAccountId }
      )
    } catch (stripeErr: any) {
      throw new AppError(stripeErr.message || 'Payout request failed.', 502, 'STRIPE_PAYOUT_FAILED')
    }

    // Record payout in DB
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(toZonedTime(now, SYDNEY_TZ))
    const endOfCurrentMonth = endOfMonth(toZonedTime(now, SYDNEY_TZ))

    const [payout] = await db
      .insert(payouts)
      .values({
        tradieId,
        amountCents: availableBalance,
        currency: 'AUD',
        status: 'pending',
        stripePayoutId: stripePayout.id,
        stripeAccountId,
        periodStartAt: startOfCurrentMonth,
        periodEndAt: endOfCurrentMonth,
        expectedArrivalAt: stripePayout.arrival_date
          ? new Date(stripePayout.arrival_date * 1000)
          : null,
        createdAt: now,
      })
      .returning()

    return reply.status(200).send({
      success: true,
      data: {
        payoutId: payout.id,
        stripePayoutId: stripePayout.id,
        amount: payout.amountCents,
        status: payout.status,
        expectedArrivalAt: payout.expectedArrivalAt,
      },
    })
  })

  /**
   * GET /api/v1/earnings/payouts
   * List payout history for the authenticated tradie.
   */
  fastify.get('/payouts', async (request) => {
    const tradieId = request.tradie.id

    const payoutHistory = await db
      .select()
      .from(payouts)
      .where(eq(payouts.tradieId, tradieId))
      .orderBy(sql`${payouts.createdAt} DESC`)
      .limit(50)

    return {
      success: true,
      data: { payouts: payoutHistory },
    }
  })

  /**
   * POST /api/v1/earnings/connect-onboarding
   * Create Stripe Connect Express account for per-tradie payouts.
   */
  fastify.post('/connect-onboarding', async (request) => {
    const tradieId = request.tradie.id

    const [tradie] = await db
      .select({ email: tradies.email, stripeConnectAccountId: tradies.stripeConnectAccountId })
      .from(tradies)
      .where(eq(tradies.id, tradieId))
      .limit(1)

    if (tradie?.stripeConnectAccountId) {
      const loginLink = await stripe.accounts.createLoginLink(tradie.stripeConnectAccountId)
      return { success: true, data: { url: loginLink.url, accountId: tradie.stripeConnectAccountId } }
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'AU',
      email: tradie?.email ?? undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    })

    await db
      .update(tradies)
      .set({ stripeConnectAccountId: account.id, updatedAt: new Date() })
      .where(eq(tradies.id, tradieId))

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.WEB_APP_URL || 'https://tradiemate.com.au'}/enterprise`,
      return_url: `tradiemate://earnings/connect?success=true`,
      type: 'account_onboarding',
    })

    return { success: true, data: { url: accountLink.url, accountId: account.id } }
  })
}

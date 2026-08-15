// src/routes/tradies/handler.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '../../config/db'
import { jobs, invoices, tradies } from '../../db/schema'
import { customers } from '../../db/schema/customers'
import { tradieSubscriptions } from '../../db/schema/subscriptions'
import { eq, and, inArray, count, gte, lt, sql } from 'drizzle-orm'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { validateLegalConsent } from '../../domain/legal'
import { ABNService } from '../../services/abn.service'
import { JobService } from '../../services/job.service'
import { AppError } from '../../utils/errors'

const AEST = 'Australia/Sydney'
const TRIAL_DAYS = 14

export async function getDashboardStats(tradieId: string) {
  const now = new Date()
  const aestNow = toZonedTime(now, AEST)
  const todayStart = startOfDay(aestNow)
  const todayEnd = endOfDay(aestNow)

  const [jobStats, invoiceStats, nextJobRow] = await Promise.all([
    db
      .select({
        total: count(),
        upcoming: sql<number>`count(*) filter (where status = 'UPCOMING')`,
        inProgress: sql<number>`count(*) filter (where status = 'IN_PROGRESS')`,
        commuting: sql<number>`count(*) filter (where status = 'COMMUTING')`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.tradieId, tradieId),
          inArray(jobs.status, ['UPCOMING', 'COMMUTING', 'IN_PROGRESS', 'COMPLETED']),
          gte(jobs.scheduledAt, todayStart),
          lt(jobs.scheduledAt, todayEnd)
        )
      ),

    db
      .select({
        pendingCount: sql<number>`count(*) filter (where status in ('DRAFT','SENT'))`,
        todayRevenue: sql<number>`coalesce(sum(total_cents) filter (where status = 'PAID' and paid_at >= ${todayStart.toISOString()} and paid_at < ${todayEnd.toISOString()}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.tradieId, tradieId)),

    db
      .select({ job: jobs, customer: customers })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .where(
        and(
          eq(jobs.tradieId, tradieId),
          inArray(jobs.status, ['UPCOMING', 'COMMUTING']),
          gte(jobs.scheduledAt, now)
        )
      )
      .orderBy(jobs.scheduledAt)
      .limit(1),
  ])

  const nextJob = nextJobRow[0]
    ? JobService.formatJobResponse(nextJobRow[0].job, nextJobRow[0].customer)
    : null

  return {
    jobs_today: Number(jobStats[0]?.total ?? 0),
    pending_invoices: Number(invoiceStats[0]?.pendingCount ?? 0),
    estimated_revenue_today_cents: Number(invoiceStats[0]?.todayRevenue ?? 0),
    next_job: nextJob,
  }
}

export const registerTradieHandler = async (
  request: FastifyRequest<any>,
  reply: FastifyReply
) => {
  const { first_name, last_name, trade_type, abn, legal_consent } = request.body as any
  const user = request.user as any
  const cleanAbn = abn ? String(abn).replace(/\s/g, '') : null

  if (!cleanAbn) {
    return reply.status(400).send({ error: 'ABN is required', code: 'ABN_REQUIRED' })
  }

  const consentError = validateLegalConsent(legal_consent)
  if (consentError) {
    return reply.status(400).send({
      error: 'Legal consent required or outdated',
      code: consentError,
    })
  }

  const consentAt = legal_consent.accepted_at
    ? new Date(legal_consent.accepted_at)
    : new Date()

  const [existingTradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, user.id))
    .limit(1)

  if (existingTradie) {
    return reply.status(409).send({
      success: false,
      error: {
        statusCode: 409,
        code: 'TRADIE_EXISTS',
        message: 'Tradie profile already exists',
      },
    })
  }

  if (!ABNService.validateLuhn(cleanAbn)) {
    throw new AppError('Invalid ABN format. Please check the number and try again.', 400, 'ABN_INVALID')
  }

  const abnDetails = await ABNService.lookup(cleanAbn)
  if (!abnDetails || !abnDetails.active) {
    throw new AppError(
      'ABN could not be verified with the ATO. Please check the number or contact support.',
      400,
      'ABN_VERIFICATION_FAILED'
    )
  }

  const [newTradie] = await db
    .insert(tradies)
    .values({
      authUserId: user.id,
      firstName: first_name,
      lastName: last_name,
      phone: user.phone ?? '',
      tradeType: trade_type,
      abn: cleanAbn,
      abnEntityName: abnDetails.entityName,
      abnGstRegistered: abnDetails.gstRegistered,
      abnVerifiedAt: new Date(),
      abnVerificationStatus: 'VERIFIED',
      onboardingStatus: 'PROFILE_SUBMITTED',
      isActive: true,
      isOnboarded: false,
      termsAcceptedAt: consentAt,
      termsVersion: legal_consent.terms_version,
      privacyAcceptedAt: consentAt,
      privacyVersion: legal_consent.privacy_version,
      disclaimerAcceptedAt: consentAt,
      disclaimerVersion: legal_consent.disclaimer_version,
    })
    .returning()

  const trialEndsAt = addDays(new Date(), TRIAL_DAYS)
  const periodEnd = addDays(new Date(), TRIAL_DAYS)

  await db.insert(tradieSubscriptions).values({
    tradieId: newTradie.id,
    planCode: 'SOLO_STARTER',
    status: 'TRIALING',
    trialEndsAt,
    currentPeriodStart: new Date(),
    currentPeriodEnd: periodEnd,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return {
    success: true,
    data: {
      tradie_id: newTradie.id,
      is_new_user: true,
      abn_entity_name: abnDetails.entityName,
    },
  }
}

export const getDashboardStatsHandler = async (request: FastifyRequest<any>) => {
  const tradieId = request.tradie.id
  const stats = await getDashboardStats(tradieId)
  return {
    success: true,
    data: stats,
  }
}

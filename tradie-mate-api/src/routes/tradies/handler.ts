// src/routes/tradies/handler.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '../../config/db'
import { jobs, invoices, tradies } from '../../db/schema'
import { eq, and, inArray, count, gte, lt, sql } from 'drizzle-orm'
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { validateLegalConsent } from '../../domain/legal'

const AEST = 'Australia/Sydney'

export async function getDashboardStats(tradieId: string) {
  const now = new Date()
  const aestNow = toZonedTime(now, AEST)
  const todayStart = startOfDay(aestNow)
  const todayEnd = endOfDay(aestNow)

  // Parallel queries — Promise.all, not sequential
  const [jobStats, invoiceStats, nextJob] = await Promise.all([

    // Jobs today
    db
      .select({
        total:       count(),
        upcoming:    sql<number>`count(*) filter (where status = 'UPCOMING')`,
        inProgress:  sql<number>`count(*) filter (where status = 'IN_PROGRESS')`,
        commuting:   sql<number>`count(*) filter (where status = 'COMMUTING')`,
      })
      .from(jobs)
      .where(and(
        eq(jobs.tradieId, tradieId),
        inArray(jobs.status, ['UPCOMING', 'COMMUTING', 'IN_PROGRESS', 'COMPLETED']),
        gte(jobs.scheduledAt, todayStart),
        lt(jobs.scheduledAt, todayEnd),
      )),

    // Pending invoices + estimated revenue
    db
      .select({
        pendingCount:   sql<number>`count(*) filter (where status in ('DRAFT','SENT'))`,
        todayRevenue:   sql<number>`coalesce(sum(total_cents) filter (where status = 'PAID' and paid_at >= ${todayStart.toISOString()} and paid_at < ${todayEnd.toISOString()}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.tradieId, tradieId)),

    // Next upcoming job
    db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.tradieId, tradieId),
        inArray(jobs.status, ['UPCOMING', 'COMMUTING']),
        gte(jobs.scheduledAt, now),
      ))
      .orderBy(jobs.scheduledAt)
      .limit(1),
  ])

  return {
    jobs_today:                    Number(jobStats[0]?.total ?? 0),
    pending_invoices:              Number(invoiceStats[0]?.pendingCount ?? 0),
    estimated_revenue_today_cents: Number(invoiceStats[0]?.todayRevenue ?? 0),
    next_job:                      nextJob[0] ?? null,
  }
}
export const registerTradieHandler = async (
  request: FastifyRequest<any>,
  reply: FastifyReply
) => {
  const { first_name, last_name, trade_type, abn, legal_consent } = request.body as any
  const user = request.user as any

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

  // Check no existing tradie for this auth_user_id
  const [existingTradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, user.id))
    .limit(1)

  if (existingTradie) {
    return reply.status(409).send({ error: 'Tradie profile already exists' })
  }

  // Insert tradie record
  const [newTradie] = await db.insert(tradies).values({
    authUserId: user.id,
    firstName: first_name,
    lastName: last_name,
    phone: user.phone ?? '', // from Supabase auth
    tradeType: trade_type,
    abn: abn,
    isActive: true,
    isOnboarded: false,
    termsAcceptedAt: consentAt,
    termsVersion: legal_consent.terms_version,
    privacyAcceptedAt: consentAt,
    privacyVersion: legal_consent.privacy_version,
    disclaimerAcceptedAt: consentAt,
    disclaimerVersion: legal_consent.disclaimer_version,
  }).returning()

  return { tradie_id: newTradie.id, is_new_user: false }
}

export const getDashboardStatsHandler = async (
  request: FastifyRequest<any>,
  reply: FastifyReply
) => {
  const tradieId = request.tradie.id
  const stats = await getDashboardStats(tradieId)
  return {
    success: true,
    data: stats
  }
}



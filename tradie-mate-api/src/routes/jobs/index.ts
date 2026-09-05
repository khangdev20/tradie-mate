import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requireOnboarded } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { customers } from '../../db/schema/customers'
import { trackingSessions } from '../../db/schema/location'
import { marketplaceBookings } from '../../db/schema/marketplace'
import { redisConnection } from '../../config/redis'
import { eq, and, asc, count } from 'drizzle-orm'
import { JobService, JobStatus, CreateJobInput } from '../../services/job.service'
import { EntitlementService } from '../../services/entitlement.service'
import { AppError } from '../../utils/errors'
import { firestore } from '../../config/firebase'
import { env } from '../../config/env'
import { Queue } from 'bullmq'
import twilio from 'twilio'
import crypto from 'crypto'

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireOnboarded)

  // 1. List jobs
  fastify.get<{ Querystring: { status?: string; limit?: number; offset?: number } }>('/', async (request) => {
    const { status, limit = 20, offset = 0 } = request.query
    const tradieId = request.tradie.id

    const conditions = [eq(jobs.tradieId, tradieId)]
    if (status) {
      const normalizedStatus = JobService.normalizeStatus(status)
      conditions.push(eq(jobs.status, normalizedStatus as any))
    }

    const whereClause = and(...conditions)
    const [totalResult] = await db
      .select({ total: count() })
      .from(jobs)
      .where(whereClause)

    const jobRows = await db
      .select({ job: jobs, customer: customers })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .where(whereClause)
      .orderBy(asc(jobs.scheduledAt))
      .limit(limit)
      .offset(offset)

    const jobList = jobRows.map((row) => JobService.formatJobResponse(row.job, row.customer))

    return {
      success: true,
      data: {
        jobs: jobList,
        meta: {
          total: Number(totalResult?.total ?? 0),
          limit,
          offset,
        },
      },
    }
  })

  // 2. Get job by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    const job = await JobService.getJobWithOwnerCheck(request.params.id, request.tradie.id)
    return {
      success: true,
      data: job,
    }
  })

  // 3. Create job
  fastify.post<{ Body: CreateJobInput }>('/', async (request, reply) => {
    const tradieId = request.tradie.id
    const body = request.body

    if (!body.title?.trim() || !body.address?.trim()) {
      throw new AppError('Job title and address are required.', 400, 'VALIDATION_ERROR')
    }

    await EntitlementService.requireUsageLimit(tradieId, 'jobsCreated', 'maxJobsPerMonth')

    const newJob = await JobService.createJob(tradieId, {
      ...body,
      title: body.title.trim(),
      address: body.address.trim(),
    })

    await EntitlementService.incrementUsage(tradieId, 'jobsCreated')

    return reply.status(201).send({
      success: true,
      data: newJob,
    })
  })

  // 4. Update job notes
  fastify.patch<{ Params: { id: string }; Body: { notes: string } }>('/:id', async (request) => {
    const { notes } = request.body
    if (notes === undefined) {
      throw new AppError('Notes field is required.', 400, 'VALIDATION_ERROR')
    }

    const updated = await JobService.updateNotes(request.params.id, request.tradie.id, notes)
    return {
      success: true,
      data: updated,
    }
  })

  // 5. Update status
  fastify.patch<{
    Params: { id: string }
    Body: { status: JobStatus }
  }>('/:id/status', async (request) => {
    const { status } = request.body
    if (!status) {
      throw new AppError('Status is required', 400, 'VALIDATION_ERROR')
    }

    if (status === 'COMMUTING') {
      await EntitlementService.requireEntitlement(request.tradie.id, 'customerTrackingEnabled')
    }

    const updatedJob = await JobService.transitionStatus(
      request.params.id,
      request.tradie.id,
      status
    )

    return {
      success: true,
      data: updatedJob,
    }
  })

  // 6. Start commute — creates tracking session + Firestore doc + Twilio SMS
  fastify.post<{ Params: { id: string } }>('/:id/start-commute', async (request, reply) => {
    const { id: jobId } = request.params
    const tradieId = request.tradie.id
    const tradie = request.tradie

    // Entitlement check (belt-and-suspenders alongside status transition guard)
    await EntitlementService.requireEntitlement(tradieId, 'customerTrackingEnabled')

    // Verify job ownership
    const job = await JobService.getJobWithOwnerCheck(jobId, tradieId)

    // Generate unique tracking token
    const trackingToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours

    // Upsert tracking session in Postgres
    await db
      .insert(trackingSessions)
      .values({
        tradieId,
        jobId,
        isActive: true,
        startedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [trackingSessions.jobId],
        set: {
          isActive: true,
          startedAt: new Date(),
          endedAt: null,
        },
      })

    // Update job with tracking token
    await db
      .update(jobs)
      .set({
        trackingToken,
        trackingTokenExpiresAt: expiresAt,
        commutingStartedAt: new Date(),
        status: 'COMMUTING',
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))

    // Create initial Firestore tracking document
    const tradieName = `${tradie.firstName} ${tradie.lastName}`.trim()
    const plateParts = [tradie.vehicleColor, tradie.vehicleMake, tradie.vehiclePlate].filter(Boolean)
    const plateDisplay = plateParts.join(' · ') || 'TradieMate Vehicle'

    await firestore.collection('tracking').doc(jobId).set({
      jobId,
      tradieId,
      tradieFirstName: tradie.firstName,
      plateDisplay,
      latitude: 0,
      longitude: 0,
      heading: 0,
      speedMetersPerSecond: 0,
      etaSeconds: null,
      distanceRemainingMeters: null,
      routePolyline: null,
      status: 'COMMUTING',
      updatedAt: new Date().toISOString(),
      staleAfterSeconds: 20,
    })

    // Send Twilio SMS to customer with tracking link (best-effort)
    const trackingUrl = `https://tradiemate.com.au/track/${trackingToken}`
    if (job.customerId) {
      try {
        const [customer] = await db
          .select({ phone: customers.phone })
          .from(customers)
          .where(eq(customers.id, job.customerId))
          .limit(1)

        if (customer?.phone) {
          await twilioClient.messages.create({
            from: env.TWILIO_FROM_NUMBER,
            to: customer.phone,
            body: `${tradieName} is en route. Track arrival: ${trackingUrl}`,
          })
          await db
            .update(jobs)
            .set({ trackingLinkSentAt: new Date() })
            .where(eq(jobs.id, jobId))
        }
      } catch (smsErr) {
        fastify.log.warn({ smsErr, jobId }, 'Failed to send tracking SMS')
      }
    }

    return reply.status(201).send({
      success: true,
      data: {
        trackingToken,
        trackingUrl,
        expiresAt: expiresAt.toISOString(),
      },
    })
  })

  // 7. End commute — closes tracking session + deletes Firestore doc
  fastify.post<{ Params: { id: string } }>('/:id/end-commute', async (request) => {
    const { id: jobId } = request.params
    const tradieId = request.tradie.id

    await JobService.getJobWithOwnerCheck(jobId, tradieId)

    await db
      .update(trackingSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(and(eq(trackingSessions.jobId, jobId), eq(trackingSessions.tradieId, tradieId)))

    try {
      await firestore.collection('tracking').doc(jobId).delete()
    } catch (fsErr) {
      fastify.log.warn({ fsErr, jobId }, 'Failed to delete Firestore tracking doc')
    }

    return {
      success: true,
      data: { message: 'Commute tracking completed.' },
    }
  })

  // 8. Reschedule job
  fastify.patch<{
    Params: { id: string }
    Body: { scheduledAt: string; estimatedDurationMin?: number }
  }>('/:id/reschedule', async (request) => {
    const { id: jobId } = request.params
    const { scheduledAt, estimatedDurationMin } = request.body
    const tradieId = request.tradie.id

    if (!scheduledAt) {
      throw new AppError('scheduledAt is required.', 400, 'VALIDATION_ERROR')
    }

    const newDate = new Date(scheduledAt)
    if (isNaN(newDate.getTime())) {
      throw new AppError('Invalid scheduledAt date format.', 400, 'INVALID_DATE')
    }

    await JobService.getJobWithOwnerCheck(jobId, tradieId)

    const updateValues: Record<string, any> = {
      scheduledAt: newDate,
      updatedAt: new Date(),
    }
    if (estimatedDurationMin !== undefined) {
      updateValues.estimatedDurationMin = estimatedDurationMin
    }

    const [updated] = await db
      .update(jobs)
      .set(updateValues)
      .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
      .returning()

    return {
      success: true,
      data: {
        id: updated.id,
        scheduledAt: updated.scheduledAt,
        estimatedDurationMin: updated.estimatedDurationMin,
        updatedAt: updated.updatedAt,
      },
    }
  })

  // 9. Approve job completion (marketplace escrow release trigger)
  fastify.post<{ Params: { id: string } }>('/:id/approve-completion', async (request) => {
    const { id: jobId } = request.params
    const tradieId = request.tradie.id

    const job = await JobService.getJobWithOwnerCheck(jobId, tradieId)

    if (job.status !== 'COMPLETED') {
      throw new AppError('Job must be COMPLETED before approval.', 400, 'INVALID_JOB_STATE')
    }

    try {
      const escrowQueue = new Queue('escrow-release', { connection: redisConnection })
      await escrowQueue.add('release', { jobId, tradieId }, { attempts: 3 })
    } catch (queueErr) {
      fastify.log.warn({ queueErr, jobId }, 'Escrow queue not available — proceeding inline')
    }

    return {
      success: true,
      data: { message: 'Job completion approved. Escrow release initiated.' },
    }
  })

  // 10. Dispute job (marketplace escrow dispute)
  fastify.post<{
    Params: { id: string }
    Body: { reason: string }
  }>('/:id/dispute', async (request) => {
    const { id: jobId } = request.params
    const { reason } = request.body
    const tradieId = request.tradie.id

    if (!reason || reason.trim().length < 10) {
      throw new AppError('Dispute reason must be at least 10 characters.', 400, 'INVALID_REASON')
    }

    await JobService.getJobWithOwnerCheck(jobId, tradieId)

    await db
      .update(marketplaceBookings)
      .set({
        status: 'DISPUTED',
        disputeReason: reason.trim(),
        disputedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(marketplaceBookings.jobId, jobId))

    return {
      success: true,
      data: { message: 'Dispute submitted. Our team will review within 24 hours.' },
    }
  })
  // 5. Update job notes
  fastify.patch<{
    Params: { id: string }
    Body: { notes: string }
  }>('/:id/notes', async (request) => {
    const { notes } = request.body
    const tradieId = request.tradie.id

    // Verify ownership
    await JobService.getJobWithOwnerCheck(request.params.id, tradieId)

    const [updated] = await db
      .update(jobs)
      .set({ notes, updatedAt: new Date() })
      .where(and(eq(jobs.id, request.params.id), eq(jobs.tradieId, tradieId)))
      .returning()

    return {
      success: true,
      data: { id: updated.id, notes: updated.notes },
    }
  })

}

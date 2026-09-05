import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requireOnboarded } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { customers } from '../../db/schema/customers'
import { eq, and, asc } from 'drizzle-orm'
import { JobService, JobStatus } from '../../services/job.service'
import { EntitlementService } from '../../services/entitlement.service'
import { MapboxService } from '../../services/mapbox.service'
import { AppError } from '../../utils/errors'

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireOnboarded)

  // 1. List jobs
  fastify.get<{ Querystring: { status?: string; limit?: number; offset?: number } }>('/', async (request) => {
    const { status, limit = 20, offset = 0 } = request.query
    const tradieId = request.tradie.id

    const conditions = [eq(jobs.tradieId, tradieId)]
    if (status) {
      conditions.push(eq(jobs.status, status as any))
    }

    const jobList = await db
      .select({
        id: jobs.id,
        tradieId: jobs.tradieId,
        customerId: jobs.customerId,
        title: jobs.title,
        description: jobs.description,
        jobType: jobs.jobType,
        status: jobs.status,
        urgency: jobs.urgency,
        source: jobs.source,
        scheduledAt: jobs.scheduledAt,
        estimatedDurationMin: jobs.estimatedDurationMin,
        address: jobs.address,
        lat: jobs.lat,
        lng: jobs.lng,
        photos: jobs.photos,
        notes: jobs.notes,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(jobs.scheduledAt))

    return {
      success: true,
      data: {
        jobs: jobList,
        meta: {
          total: jobList.length,
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
  fastify.post<{
    Body: {
      customerId?: string
      customerName?: string
      customerPhone?: string
      title: string
      description?: string
      jobType?: string
      address: string
      scheduledAt?: string
      estimatedDurationMin?: number
      urgency?: 'EMERGENCY' | 'TODAY' | 'THIS_WEEK' | 'FLEXIBLE'
      source?: 'MANUAL' | 'PHONE_CALL' | 'CUSTOMER_BOOKING' | 'REFERRAL'
    }
  }>('/', async (request, reply) => {
    const tradieId = request.tradie.id
    const body = request.body

    // A. Check subscription limits
    await EntitlementService.requireUsageLimit(tradieId, 'jobsCreated', 'maxJobsPerMonth')

    // B. Geocode address via MapboxService
    let lat = '0'
    let lng = '0'
    try {
      const geocode = await MapboxService.geocodeAddress(body.address)
      lat = geocode.latitude.toString()
      lng = geocode.longitude.toString()
    } catch (err) {
      console.warn('Geocoding failed for job address:', err)
    }

    // C. Find or create customer if name and phone are provided
    let customerId = body.customerId ?? null
    if (!customerId && body.customerName && body.customerPhone) {
      const cleanPhone = body.customerPhone.trim()
      const [existingCust] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.tradieId, tradieId), eq(customers.phone, cleanPhone)))
        .limit(1)

      if (existingCust) {
        customerId = existingCust.id
      } else {
        const [newCust] = await db
          .insert(customers)
          .values({
            tradieId,
            name: body.customerName.trim(),
            phone: cleanPhone,
            source: 'MANUAL',
          })
          .returning()
        customerId = newCust.id
      }
    }

    // D. Insert job
    const [newJob] = await db
      .insert(jobs)
      .values({
        tradieId,
        customerId,
        title: body.title,
        description: body.description ?? null,
        jobType: body.jobType ?? 'Repair',
        status: 'UPCOMING',
        urgency: body.urgency ?? 'FLEXIBLE',
        source: body.source ?? 'MANUAL',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
        estimatedDurationMin: body.estimatedDurationMin ?? 60,
        address: body.address,
        lat,
        lng,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // E. Increment subscription usage counter
    await EntitlementService.incrementUsage(tradieId, 'jobsCreated')

    return reply.status(201).send({
      success: true,
      data: {
        ...newJob,
        customerName: body.customerName ?? null,
        customerPhone: body.customerPhone ?? null,
      },
    })
  })

  // 4. Update status
  fastify.patch<{
    Params: { id: string }
    Body: { status: JobStatus }
  }>('/:id/status', async (request) => {
    const { status } = request.body
    if (!status) {
      throw new AppError('Status is required', 400)
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

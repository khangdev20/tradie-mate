import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { eq, and, asc } from 'drizzle-orm'
import { JobService, JobStatus } from '../../services/job.service'
import { EntitlementService } from '../../services/entitlement.service'
import { MapboxService } from '../../services/mapbox.service'
import { AppError } from '../../utils/errors'

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  // 1. List jobs
  fastify.get<{ Querystring: { status?: string; limit?: number; offset?: number } }>('/', async (request) => {
    const { status, limit = 20, offset = 0 } = request.query
    const tradieId = request.tradie.id

    const conditions = [eq(jobs.tradieId, tradieId)]
    if (status) {
      conditions.push(eq(jobs.status, status as any))
    }

    const jobList = await db
      .select()
      .from(jobs)
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

    // C. Insert job
    const [newJob] = await db
      .insert(jobs)
      .values({
        tradieId,
        customerId: body.customerId ?? null,
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

    // D. Increment subscription usage counter
    await EntitlementService.incrementUsage(tradieId, 'jobsCreated')

    return reply.status(201).send({
      success: true,
      data: newJob,
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

}


import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { customers } from '../../db/schema/customers'
import { eq, and, asc, count } from 'drizzle-orm'
import { JobService, JobStatus, CreateJobInput } from '../../services/job.service'
import { EntitlementService } from '../../services/entitlement.service'
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
}

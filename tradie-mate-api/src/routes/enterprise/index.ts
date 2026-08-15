import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { enterpriseClients, enterpriseJobs } from '../../db/schema/enterprise'
import { jobs } from '../../db/schema/jobs'
import { tradies } from '../../db/schema/tradies'
import { eq, and, sql } from 'drizzle-orm'
import { AppError } from '../../utils/errors'
import { fcm } from '../../config/firebase'

export async function enterpriseRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/v1/enterprise/jobs/dispatch
   * Module 4.2 — Enterprise client dispatches a job to a specific tradie.
   * Auth: X-Enterprise-Api-Key header (not JWT — enterprise clients use API key auth).
   */
  fastify.post<{
    Body: {
      tradieId: string
      propertyRef: string
      propertyAddress: string
      issueType: string
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY'
      requestedAt?: string
      clientRef?: string
    }
  }>('/jobs/dispatch', async (request, reply) => {
    const apiKey = request.headers['x-enterprise-api-key'] as string | undefined

    if (!apiKey) {
      throw new AppError('X-Enterprise-Api-Key header is required.', 401, 'MISSING_API_KEY')
    }

    // Authenticate enterprise client
    const [client] = await db
      .select()
      .from(enterpriseClients)
      .where(and(eq(enterpriseClients.apiKey, apiKey), eq(enterpriseClients.isActive, true)))
      .limit(1)

    if (!client) {
      throw new AppError('Invalid or inactive enterprise API key.', 401, 'INVALID_API_KEY')
    }

    const { tradieId, propertyRef, propertyAddress, issueType, priority = 'NORMAL', requestedAt, clientRef } = request.body

    if (!tradieId || !propertyRef || !propertyAddress || !issueType) {
      throw new AppError('tradieId, propertyRef, propertyAddress, and issueType are required.', 400, 'MISSING_FIELDS')
    }

    // Verify tradie exists and is active
    const [tradie] = await db
      .select({ id: tradies.id, firstName: tradies.firstName, fcmToken: tradies.fcmToken })
      .from(tradies)
      .where(and(eq(tradies.id, tradieId), eq(tradies.isActive, true)))
      .limit(1)

    if (!tradie) {
      throw new AppError('Tradie not found or inactive.', 404, 'TRADIE_NOT_FOUND')
    }

    // Create a job record
    const scheduledDate = requestedAt ? new Date(requestedAt) : new Date(Date.now() + 60 * 60 * 1000)
    const [newJob] = await db
      .insert(jobs)
      .values({
        tradieId,
        title: `Enterprise: ${issueType}`,
        description: `Property: ${propertyRef}\nAddress: ${propertyAddress}\nIssue: ${issueType}`,
        jobType: 'Enterprise',
        status: 'UPCOMING',
        urgency: priority === 'EMERGENCY' ? 'EMERGENCY' : priority === 'HIGH' ? 'TODAY' : 'FLEXIBLE',
        source: 'CUSTOMER_BOOKING',
        address: propertyAddress,
        scheduledAt: scheduledDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Create enterprise job record
    const [enterpriseJob] = await db
      .insert(enterpriseJobs)
      .values({
        clientId: client.id,
        tradieId,
        jobId: newJob.id,
        propertyRef,
        propertyAddress,
        issueType,
        priority,
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
        clientRef: clientRef || null,
        createdAt: new Date(),
      })
      .returning()

    // Notify tradie via FCM
    if (tradie.fcmToken) {
      try {
        await fcm.send({
          token: tradie.fcmToken,
          notification: {
            title: `Enterprise Job: ${issueType}`,
            body: `${client.companyName} dispatched a job at ${propertyAddress}`,
          },
          data: {
            type: 'JOB_ASSIGNED',
            jobId: newJob.id,
            enterpriseJobId: enterpriseJob.id,
            clientName: client.companyName,
          },
        })
      } catch (fcmErr) {
        fastify.log.warn({ fcmErr, tradieId }, 'FCM notification failed for enterprise dispatch')
      }
    }

    return reply.status(201).send({
      success: true,
      data: {
        enterpriseJobId: enterpriseJob.id,
        jobId: newJob.id,
        status: enterpriseJob.status,
        dispatchedAt: enterpriseJob.dispatchedAt,
      },
    })
  })

  /**
   * GET /api/v1/enterprise/jobs
   * Returns enterprise jobs for the authenticated tradie.
   */
  fastify.get('/jobs', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest) => {
    const tradieId = request.tradie.id

    const dispatched = await db
      .select()
      .from(enterpriseJobs)
      .where(eq(enterpriseJobs.tradieId, tradieId))
      .orderBy(sql`${enterpriseJobs.dispatchedAt} DESC`)
      .limit(50)

    return {
      success: true,
      data: { jobs: dispatched },
    }
  })

  /**
   * GET /api/v1/enterprise/organizations/:orgId/jobs
   * Enterprise portal job queue (API key auth).
   */
  fastify.get<{ Params: { orgId: string } }>('/organizations/:orgId/jobs', async (request) => {
    const apiKey = request.headers['x-enterprise-api-key'] as string | undefined
    if (!apiKey) throw new AppError('X-Enterprise-Api-Key header is required.', 401, 'MISSING_API_KEY')

    const [client] = await db
      .select()
      .from(enterpriseClients)
      .where(and(eq(enterpriseClients.apiKey, apiKey), eq(enterpriseClients.id, request.params.orgId)))
      .limit(1)

    if (!client) throw new AppError('Invalid enterprise credentials.', 401, 'INVALID_API_KEY')

    const rows = await db
      .select({
        id: enterpriseJobs.id,
        title: enterpriseJobs.issueType,
        status: enterpriseJobs.status,
        propertyAddress: enterpriseJobs.propertyAddress,
        scheduledAt: enterpriseJobs.dispatchedAt,
      })
      .from(enterpriseJobs)
      .where(eq(enterpriseJobs.clientId, client.id))
      .orderBy(sql`${enterpriseJobs.dispatchedAt} DESC`)
      .limit(50)

    return { success: true, data: { jobs: rows } }
  })
}

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema'
import { eq, asc } from 'drizzle-orm'

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.get('/', async (request) => {
    // List jobs for the current tradie
    return await db.query.jobs.findMany({
      where: eq(jobs.tradieId, request.tradie.id),
      with: {
        customer: true,
      },
      orderBy: [asc(jobs.scheduledAt)],
    })
  })

  // Placeholder for other handlers
}

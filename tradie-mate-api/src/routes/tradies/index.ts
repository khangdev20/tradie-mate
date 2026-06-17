import { FastifyInstance } from 'fastify'
import { registerTradieHandler, getDashboardStatsHandler } from './handler'
import { registerTradieSchema } from './schema'
import { requireAuth } from '../../middleware/requireAuth'
import { db } from '../../config/db'
import { tradies } from '../../db/schema/tradies'
import { eq } from 'drizzle-orm'

export async function tradieRoutes(fastify: FastifyInstance) {
  fastify.post('/register', { 
    schema: registerTradieSchema,
    preHandler: [requireAuth] 
  }, registerTradieHandler)

  fastify.get('/dashboard', {
    preHandler: [requireAuth]
  }, getDashboardStatsHandler)

  fastify.patch('/profile/public', {
    preHandler: [requireAuth],
  }, async (request: any) => {
    const tradieId = request.tradie.id
    const { slug, enabled } = request.body as { slug?: string; enabled?: boolean }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (slug !== undefined) updates.publicProfileSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (enabled !== undefined) updates.publicProfileEnabled = enabled

    const [updated] = await db
      .update(tradies)
      .set(updates)
      .where(eq(tradies.id, tradieId))
      .returning({
        publicProfileSlug: tradies.publicProfileSlug,
        publicProfileEnabled: tradies.publicProfileEnabled,
      })

    return { success: true, data: updated }
  })
}


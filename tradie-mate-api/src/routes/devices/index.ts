import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { tradies } from '../../db/schema/tradies'
import { eq } from 'drizzle-orm'
import { AppError } from '../../utils/errors'

export async function deviceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/fcm-token', async (request: FastifyRequest<{
    Body: { token: string; platform?: 'ios' | 'android' }
  }>) => {
    const { token } = request.body
    const tradieId = request.tradie.id

    if (!token?.trim()) {
      throw new AppError('FCM token is required.', 400, 'VALIDATION_ERROR')
    }

    await db
      .update(tradies)
      .set({
        fcmToken: token.trim(),
        fcmTokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tradies.id, tradieId))

    return {
      success: true,
      data: { registered: true },
    }
  })
}

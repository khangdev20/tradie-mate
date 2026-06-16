import { FastifyInstance, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { tradies } from '../../db/schema/tradies'
import { AppError } from '../../utils/errors'

export async function deviceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/fcm-token', async (request: FastifyRequest<{
    Body: { token: string }
  }>) => {
    const { token } = request.body

    if (!token || token.length < 20) {
      throw new AppError('A valid FCM token is required.', 400)
    }

    await db
      .update(tradies)
      .set({
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tradies.id, request.tradie.id))

    return {
      success: true,
      data: { message: 'FCM token saved successfully.' },
    }
  })
}

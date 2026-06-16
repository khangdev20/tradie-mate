import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { tradies } from '../../db/schema/tradies'
import { eq } from 'drizzle-orm'
import { AppError } from '../../utils/errors'

export async function deviceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  /**
   * POST /api/v1/devices/fcm-token
   * Save or update the FCM push notification token for this tradie's device.
   */
  fastify.post<{
    Body: { token: string }
  }>('/fcm-token', async (request, reply) => {
    const { token } = request.body
    const tradieId = request.tradie.id

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new AppError('FCM token is required.', 400, 'MISSING_FCM_TOKEN')
    }

    await db
      .update(tradies)
      .set({
        fcmToken: token.trim(),
        fcmTokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tradies.id, tradieId))

    return reply.status(200).send({
      success: true,
      data: {
        message: 'FCM token saved successfully.',
      },
    })
  })
}

import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { tradies } from '../../db/schema/tradies'
import { fcmTokens } from '../../db/schema/notifications'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../../utils/errors'

export async function deviceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/fcm-token', async (request: FastifyRequest<{
    Body: { token: string; platform?: 'ios' | 'android'; deviceId?: string }
  }>, reply) => {
    const { token, platform, deviceId } = request.body
    const tradieId = request.tradie.id

    if (!token?.trim()) {
      throw new AppError('FCM token is required.', 400, 'VALIDATION_ERROR')
    }

    const trimmedToken = token.trim()

    await db
      .insert(fcmTokens)
      .values({
        tradieId,
        token: trimmedToken,
        platform: platform ?? null,
        deviceId: deviceId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [fcmTokens.tradieId, fcmTokens.token],
        set: {
          platform: platform ?? null,
          deviceId: deviceId ?? null,
          updatedAt: new Date(),
        },
      })

    // Keep legacy single-token column in sync for existing notification code
    await db
      .update(tradies)
      .set({
        fcmToken: trimmedToken,
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

  fastify.get('/fcm-tokens', async (request) => {
    const tradieId = request.tradie.id
    const tokens = await db
      .select()
      .from(fcmTokens)
      .where(eq(fcmTokens.tradieId, tradieId))

    return {
      success: true,
      data: { tokens },
    }
  })

  fastify.delete('/fcm-token', async (request: FastifyRequest<{
    Body: { token: string }
  }>) => {
    const { token } = request.body
    const tradieId = request.tradie.id

    if (!token?.trim()) {
      throw new AppError('FCM token is required.', 400, 'VALIDATION_ERROR')
    }

    await db
      .delete(fcmTokens)
      .where(and(eq(fcmTokens.tradieId, tradieId), eq(fcmTokens.token, token.trim())))

    return {
      success: true,
      data: { message: 'FCM token removed.' },
    }
  })
}

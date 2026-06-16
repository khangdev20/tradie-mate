import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { notifications } from '../../db/schema/notifications'
import { eq, and, sql } from 'drizzle-orm'
import { AppError } from '../../utils/errors'

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  /**
   * GET /api/v1/notifications
   * List notifications for the authenticated tradie.
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number; unreadOnly?: boolean }
  }>('/', async (request) => {
    const { limit = 30, offset = 0, unreadOnly = false } = request.query
    const tradieId = request.tradie.id

    const conditions = [eq(notifications.tradieId, tradieId)]
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false))
    }

    const notifList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(sql`${notifications.createdAt} DESC`)
      .limit(limit)
      .offset(offset)

    const [unreadResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.tradieId, tradieId), eq(notifications.isRead, false)))

    return {
      success: true,
      data: {
        notifications: notifList,
        unreadCount: Number(unreadResult?.count ?? 0),
      },
    }
  })

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a single notification as read.
   */
  fastify.patch<{ Params: { id: string } }>('/:id/read', async (request) => {
    const { id } = request.params
    const tradieId = request.tradie.id

    const [notif] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tradieId, tradieId)))
      .limit(1)

    if (!notif) {
      throw new AppError('Notification not found.', 404, 'NOT_FOUND')
    }

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))

    return {
      success: true,
      data: { id, isRead: true },
    }
  })

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read for the authenticated tradie.
   */
  fastify.patch('/read-all', async (request) => {
    const tradieId = request.tradie.id

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.tradieId, tradieId), eq(notifications.isRead, false)))

    return {
      success: true,
      data: { message: 'All notifications marked as read.' },
    }
  })
}

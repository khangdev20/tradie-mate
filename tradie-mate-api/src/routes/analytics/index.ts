import { FastifyInstance, FastifyRequest } from 'fastify'
import { AnalyticsService } from '../../services/analytics.service'

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.post('/events', async (request: FastifyRequest<{
    Body: {
      events: {
        eventName: string
        properties?: Record<string, unknown>
        sessionId?: string
        platform?: string
        appVersion?: string
        tradieId?: string
      }[]
    }
  }>, reply) => {
    const authTradieId = (request as any).tradie?.id as string | undefined
    const { events } = request.body

    if (!events?.length) {
      return reply.status(400).send({ success: false, error: { message: 'events array required' } })
    }

    const result = await AnalyticsService.ingestBatch(
      events.map((e) => ({
        ...e,
        tradieId: authTradieId ?? e.tradieId,
      })),
    )

    return { success: true, data: result }
  })
}

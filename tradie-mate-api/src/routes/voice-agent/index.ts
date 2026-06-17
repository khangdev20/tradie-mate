import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { voiceAgentConfigs } from '../../db/schema/webhooks'
import { eq } from 'drizzle-orm'
import { EntitlementService } from '../../services/entitlement.service'
import { AppError } from '../../utils/errors'

export async function voiceAgentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.get('/config', async (request) => {
    const tradieId = request.tradie.id
    const [config] = await db
      .select()
      .from(voiceAgentConfigs)
      .where(eq(voiceAgentConfigs.tradieId, tradieId))
      .limit(1)

    return {
      success: true,
      data: config ?? {
        isEnabled: false,
        businessHours: { mon: '08:00-17:00', tue: '08:00-17:00' },
        callScript: 'Thanks for calling. How can I help with your job today?',
        disclosureText: 'This call may be recorded for quality and training purposes.',
      },
    }
  })

  fastify.put<{
    Body: {
      isEnabled?: boolean
      vapiAssistantId?: string
      businessHours?: Record<string, string>
      callScript?: string
      disclosureText?: string
    }
  }>('/config', async (request) => {
    const tradieId = request.tradie.id
    await EntitlementService.requireEntitlement(tradieId, 'aiVoiceEnabled')

    const body = request.body
    const [existing] = await db
      .select()
      .from(voiceAgentConfigs)
      .where(eq(voiceAgentConfigs.tradieId, tradieId))
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(voiceAgentConfigs)
        .set({
          isEnabled: body.isEnabled ?? existing.isEnabled,
          vapiAssistantId: body.vapiAssistantId ?? existing.vapiAssistantId,
          businessHours: body.businessHours ?? existing.businessHours,
          callScript: body.callScript ?? existing.callScript,
          disclosureText: body.disclosureText ?? existing.disclosureText,
          updatedAt: new Date(),
        })
        .where(eq(voiceAgentConfigs.tradieId, tradieId))
        .returning()
      return { success: true, data: updated }
    }

    const [created] = await db
      .insert(voiceAgentConfigs)
      .values({
        tradieId,
        isEnabled: body.isEnabled ?? false,
        vapiAssistantId: body.vapiAssistantId,
        businessHours: body.businessHours,
        callScript: body.callScript,
        disclosureText: body.disclosureText,
      })
      .returning()

    return { success: true, data: created }
  })

  fastify.post('/connect-onboarding', async (request) => {
    const tradieId = request.tradie.id
    await EntitlementService.requireEntitlement(tradieId, 'aiVoiceEnabled')

    const assistantId = process.env.VAPI_DEFAULT_ASSISTANT_ID
    if (!assistantId) {
      throw new AppError('Vapi assistant not configured on server.', 503, 'VAPI_NOT_CONFIGURED')
    }

    return {
      success: true,
      data: {
        vapiAssistantId: assistantId,
        webhookUrl: `${process.env.WEB_APP_URL || 'https://api.tradiemate.com.au'}/api/v1/integrations/vapi/webhook`,
      },
    }
  })
}

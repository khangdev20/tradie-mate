import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { EntitlementService } from '../../services/entitlement.service'
import { db } from '../../config/db'
import { xeroConnections } from '../../db/schema/xero'
import { redisConnection } from '../../config/redis'
import { eq } from 'drizzle-orm'
import { AppError } from '../../utils/errors'
import { Queue } from 'bullmq'
import crypto from 'crypto'
import { VapiCallPayload } from '../../services/call-to-job.service'
import { WebhookInboxService } from '../../services/webhook-inbox.service'

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || ''
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || ''
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || 'https://api.tradiemate.com.au/api/v1/integrations/xero/callback'
const XERO_SCOPES = 'openid profile email accounting.transactions accounting.contacts offline_access'

export async function integrationRoutes(fastify: FastifyInstance) {
  // Routes called by third parties (Xero redirect, Vapi webhook) carry no
  // bearer token; they opt out with `config: { public: true }` and verify the
  // caller themselves (OAuth state / webhook secret).
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.config?.public) return
    return requireAuth(request, reply)
  })

  // ─── Xero ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/integrations/xero/connect
   * Module 3.2 — Returns the Xero OAuth authorization URL.
   * Requires xeroSyncEnabled entitlement.
   */
  fastify.get('/xero/connect', async (request) => {
    const tradieId = request.tradie.id
    await EntitlementService.requireEntitlement(tradieId, 'xeroSyncEnabled')

    const state = crypto.randomBytes(16).toString('hex')
    // Store state temporarily in Redis (expires 10 min) — use tradie ID as lookup
    try {
      await redisConnection.set(`xero_oauth_state:${state}`, tradieId, 'EX', 600)
    } catch (redisErr) {
      fastify.log.warn({ redisErr }, 'Redis unavailable — Xero state verification disabled')
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: XERO_CLIENT_ID,
      redirect_uri: XERO_REDIRECT_URI,
      scope: XERO_SCOPES,
      state,
    })

    const authUrl = `https://login.xero.com/identity/connect/authorize?${params.toString()}`

    return {
      success: true,
      data: { authUrl, state },
    }
  })

  /**
   * GET /api/v1/integrations/xero/callback
   * Module 3.2 — Handles Xero OAuth callback, exchanges code for tokens.
   */
  fastify.get<{
    Querystring: { code: string; state: string; error?: string }
  }>('/xero/callback', { config: { public: true } }, async (request, reply) => {
    const { code, state, error } = request.query

    if (error) {
      return reply.redirect(`tradiemate://integrations/xero?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      throw new AppError('Missing code or state in Xero callback.', 400, 'INVALID_CALLBACK')
    }

    // Validate state from Redis
    let tradieId: string | null = null
    try {
      tradieId = await redisConnection.get(`xero_oauth_state:${state}`)
      if (tradieId) {
        await redisConnection.del(`xero_oauth_state:${state}`)
      }
    } catch (redisErr) {
      fastify.log.warn({ redisErr }, 'Redis unavailable — cannot validate Xero OAuth state')
    }

    // The state is the only proof of which tradie started this OAuth flow.
    if (!tradieId) {
      return reply.redirect('tradiemate://integrations/xero?error=invalid_state')
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: XERO_REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      fastify.log.error({ errBody }, 'Xero token exchange failed')
      throw new AppError('Failed to exchange Xero authorization code.', 502, 'XERO_TOKEN_EXCHANGE_FAILED')
    }

    const tokenData = await tokenRes.json() as any
    const { access_token, refresh_token, expires_in } = tokenData
    const expiresAt = new Date(Date.now() + (expires_in || 1800) * 1000)

    // Fetch connected tenants (Xero organizations)
    const tenantsRes = await fetch('https://api.xero.com/connections', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    let tenantId = ''
    let tenantName = ''
    if (tenantsRes.ok) {
      const tenants = await tenantsRes.json() as any[]
      if (tenants.length > 0) {
        tenantId = tenants[0].tenantId
        tenantName = tenants[0].tenantName
      }
    }

    // Upsert Xero connection
    await db
      .insert(xeroConnections)
      .values({
        tradieId,
        tenantId,
        tenantName,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        connectedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [xeroConnections.tradieId],
        set: {
          tenantId,
          tenantName,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiresAt: expiresAt,
          disconnectedAt: null,
        },
      })

    // Redirect back to app
    return reply.redirect(`tradiemate://integrations/xero?success=true&tenant=${encodeURIComponent(tenantName)}`)
  })

  /**
   * DELETE /api/v1/integrations/xero
   * Disconnect Xero integration for the authenticated tradie.
   */
  fastify.delete('/xero', async (request) => {
    const tradieId = request.tradie.id

    await db
      .update(xeroConnections)
      .set({ disconnectedAt: new Date() })
      .where(eq(xeroConnections.tradieId, tradieId))

    return {
      success: true,
      data: { message: 'Xero integration disconnected.' },
    }
  })

  /**
   * GET /api/v1/integrations/xero/status
   * Returns current Xero connection status.
   */
  fastify.get('/xero/status', async (request) => {
    const tradieId = request.tradie.id

    const [conn] = await db
      .select({
        tenantName: xeroConnections.tenantName,
        connectedAt: xeroConnections.connectedAt,
        disconnectedAt: xeroConnections.disconnectedAt,
        lastSyncAt: xeroConnections.lastSyncAt,
        syncError: xeroConnections.syncError,
      })
      .from(xeroConnections)
      .where(eq(xeroConnections.tradieId, tradieId))
      .limit(1)

    const isConnected = !!conn && !conn.disconnectedAt

    return {
      success: true,
      data: {
        isConnected,
        tenantName: conn?.tenantName || null,
        connectedAt: conn?.connectedAt || null,
        lastSyncAt: conn?.lastSyncAt || null,
        syncError: conn?.syncError || null,
      },
    }
  })

  // ─── Vapi AI Voice ─────────────────────────────────────────────────────────

  /**
   * POST /api/v1/integrations/vapi/webhook
   * Module 4.3 — Handles Vapi.ai voice agent events.
   * Public endpoint (secured by API key in header).
   */
  fastify.post('/vapi/webhook', {
    // No bearer auth for Vapi webhooks — secured by the x-vapi-secret header
    config: { public: true },
  }, async (request: FastifyRequest, reply) => {
    const apiKey = request.headers['x-vapi-secret'] as string | undefined
    const expectedKey = process.env.VAPI_WEBHOOK_SECRET || ''

    if (!expectedKey || apiKey !== expectedKey) {
      return reply.status(401).send({ success: false, error: { message: 'Invalid Vapi webhook secret.' } })
    }

    const payload = request.body as any
    const eventType = payload?.message?.type || payload?.type

    fastify.log.info({ eventType, callId: payload?.call?.id }, 'Vapi webhook received')

    // Handle Vapi events
    switch (eventType) {
      case 'call-start':
        // Call started — begin recording/transcript
        break
      case 'call-end':
      case 'end-of-call-report':
        // Call ended — process transcript, extract job data
        await handleVapiCallEnd(payload, fastify)
        break
      case 'function-call':
        // AI function invocation (e.g. create_job, check_availability)
        return reply.status(200).send(await handleVapiFunctionCall(payload, fastify))
      default:
        break
    }

    return reply.status(200).send({ success: true, data: { received: true } })
  })
}

// ─── Vapi Helpers ─────────────────────────────────────────────────────────────

async function handleVapiCallEnd(payload: any, fastify: any) {
  const message = payload?.message || {}
  const call = message.call || payload?.call || {}
  const job: VapiCallPayload = {
    callId: call.id,
    transcript: message.artifact?.transcript || message.transcript || call.transcript || '',
    // customer.number is the caller; the tradie is identified by the assistant
    // or by the number that was called.
    callerNumber: message.customer?.number || call.customer?.number || '',
    tradieNumber: message.phoneNumber?.number || call.phoneNumber?.number || null,
    assistantId: message.assistant?.id || call.assistantId || null,
    recordingUrl: message.artifact?.recordingUrl || message.recordingUrl || call.recordingUrl || null,
  }

  fastify.log.info({ callId: job.callId, transcriptLength: job.transcript.length }, 'Vapi call ended')

  if (!job.callId) {
    fastify.log.warn('Vapi call-end event without a call id — ignoring')
    return
  }

  try {
    const transcriptQueue = new Queue('vapi-transcript', { connection: redisConnection })
    await transcriptQueue.add('process', job, { attempts: 3, jobId: `vapi-${job.callId}` })
  } catch (err) {
    fastify.log.error({ err, callId: job.callId }, 'Failed to queue Vapi transcript — saving for replay')
    await WebhookInboxService.ingest({ provider: 'vapi-call', eventId: job.callId, payload: job })
      .catch((ingestErr) => fastify.log.error({ ingestErr }, 'Failed to save Vapi call for replay'))
  }
}

async function handleVapiFunctionCall(payload: any, fastify: any): Promise<any> {
  const funcName = payload?.message?.functionCall?.name
  const funcArgs = payload?.message?.functionCall?.parameters || {}

  fastify.log.info({ funcName, funcArgs }, 'Vapi function call')

  switch (funcName) {
    case 'check_availability':
      return { result: 'available', message: 'Tradie is available for that time slot.' }
    case 'create_job':
      return { result: 'created', message: 'Job has been created and confirmed.' }
    case 'get_eta':
      return { result: '30 minutes', message: 'Estimated arrival in 30 minutes.' }
    default:
      return { result: 'unknown_function', message: `Function ${funcName} is not supported.` }
  }
}

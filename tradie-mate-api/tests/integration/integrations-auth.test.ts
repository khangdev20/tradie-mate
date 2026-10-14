import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'

const queueAdd = vi.fn()

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: queueAdd })),
}))
vi.mock('../../src/config/db', () => ({ db: {} }))
vi.mock('../../src/config/redis', () => ({ redisConnection: { get: vi.fn(), del: vi.fn() } }))
vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('bad token') }) } },
}))
vi.mock('../../src/services/entitlement.service', () => ({ EntitlementService: {} }))
vi.mock('../../src/services/webhook-inbox.service', () => ({
  WebhookInboxService: { ingest: vi.fn().mockResolvedValue('row-1') },
}))

import { integrationRoutes } from '../../src/routes/integrations'
import { redisConnection } from '../../src/config/redis'
import { WebhookInboxService } from '../../src/services/webhook-inbox.service'

const SECRET = 'vapi-test-secret'

describe('integration routes auth', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    process.env.VAPI_WEBHOOK_SECRET = SECRET
    app = Fastify()
    await app.register(integrationRoutes, { prefix: '/api/v1/integrations' })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => vi.clearAllMocks())

  it('still requires a bearer token for tradie routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/integrations/xero/status' })
    expect(res.statusCode).toBe(401)
  })

  it('lets Vapi reach its webhook without a bearer token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/vapi/webhook',
      headers: { 'x-vapi-secret': SECRET },
      payload: { message: { type: 'call-start' } },
    })
    expect(res.statusCode).toBe(200)
  })

  it('rejects a Vapi webhook with the wrong secret', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/vapi/webhook',
      headers: { 'x-vapi-secret': 'nope' },
      payload: { message: { type: 'call-start' } },
    })
    expect(res.statusCode).toBe(401)
    expect(res.body).toContain('Invalid Vapi webhook secret')
  })

  it('queues an ended call with the caller and tradie numbers the right way round', async () => {
    queueAdd.mockResolvedValueOnce(undefined)

    await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/vapi/webhook',
      headers: { 'x-vapi-secret': SECRET },
      payload: {
        message: {
          type: 'end-of-call-report',
          call: { id: 'call-1' },
          customer: { number: '+61400000000' },
          phoneNumber: { number: '+61700000000' },
          assistant: { id: 'asst-1' },
          artifact: { transcript: 'Leaking tap in Ashgrove' },
        },
      },
    })

    expect(queueAdd).toHaveBeenCalledWith('process', {
      callId: 'call-1',
      transcript: 'Leaking tap in Ashgrove',
      callerNumber: '+61400000000',
      tradieNumber: '+61700000000',
      assistantId: 'asst-1',
      recordingUrl: null,
    }, expect.objectContaining({ jobId: 'vapi-call-1' }))
  })

  it('saves the call to the webhook inbox when the queue is unavailable', async () => {
    queueAdd.mockRejectedValueOnce(new Error('redis down'))

    await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/vapi/webhook',
      headers: { 'x-vapi-secret': SECRET },
      payload: { message: { type: 'call-end', call: { id: 'call-2', transcript: 'Blocked drain' } } },
    })

    expect(WebhookInboxService.ingest).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'vapi-call',
      eventId: 'call-2',
    }))
  })

  it('lets the Xero OAuth redirect in but rejects an unknown state', async () => {
    vi.mocked(redisConnection.get).mockResolvedValueOnce(null)

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/xero/callback?code=abc&state=forged',
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('tradiemate://integrations/xero?error=invalid_state')
  })
})

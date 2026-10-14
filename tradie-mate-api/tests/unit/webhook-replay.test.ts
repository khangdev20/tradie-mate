import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/services/webhook-inbox.service', () => ({
  WebhookInboxService: {
    getPendingBatch: vi.fn(),
    markProcessed: vi.fn(),
    markFailed: vi.fn(),
    recordAttemptFailure: vi.fn(),
  },
}))
vi.mock('../../src/services/call-to-job.service', () => ({
  CallToJobService: { processTwilioCall: vi.fn(), processVapiCall: vi.fn() },
}))

import { WebhookInboxService } from '../../src/services/webhook-inbox.service'
import { CallToJobService } from '../../src/services/call-to-job.service'
import { replayPendingWebhooks } from '../../src/services/webhook-replay.service'

const row = (provider: string, id = 'row-1') => ({
  id, provider, eventId: 'evt-1', attempts: '1', payload: { callSid: 'CA1' },
})

describe('replayPendingWebhooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs the real processor before marking a row processed', async () => {
    vi.mocked(WebhookInboxService.getPendingBatch).mockResolvedValueOnce([row('twilio-call')] as any)

    const summary = await replayPendingWebhooks()

    expect(CallToJobService.processTwilioCall).toHaveBeenCalledWith({ callSid: 'CA1' })
    expect(WebhookInboxService.markProcessed).toHaveBeenCalledWith('row-1')
    expect(summary).toEqual({ processed: 1, failed: 0 })
  })

  it('keeps a failing row for retry and carries on with the batch', async () => {
    vi.mocked(WebhookInboxService.getPendingBatch).mockResolvedValueOnce([
      row('vapi-call', 'row-1'),
      row('twilio-call', 'row-2'),
    ] as any)
    vi.mocked(CallToJobService.processVapiCall).mockRejectedValueOnce(new Error('db down'))

    const summary = await replayPendingWebhooks()

    expect(WebhookInboxService.recordAttemptFailure).toHaveBeenCalledWith('row-1', '1', 'Error: db down')
    expect(WebhookInboxService.markProcessed).toHaveBeenCalledWith('row-2')
    expect(WebhookInboxService.markProcessed).not.toHaveBeenCalledWith('row-1')
    expect(summary).toEqual({ processed: 1, failed: 1 })
  })

  it('fails rows from providers it cannot replay', async () => {
    vi.mocked(WebhookInboxService.getPendingBatch).mockResolvedValueOnce([row('mystery')] as any)

    await replayPendingWebhooks()

    expect(WebhookInboxService.markFailed).toHaveBeenCalledWith('row-1', expect.stringContaining('mystery'))
    expect(WebhookInboxService.markProcessed).not.toHaveBeenCalled()
  })
})

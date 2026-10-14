import { WebhookInboxService } from './webhook-inbox.service'
import { CallToJobService, TwilioCallPayload, VapiCallPayload } from './call-to-job.service'

/**
 * Webhooks that are acknowledged before they are processed (Twilio, Vapi)
 * land in the raw_webhooks inbox when processing fails. Each provider maps to
 * the same idempotent processor the live webhook uses, so a replay does the
 * real work instead of just flipping the row's status.
 */
export const WEBHOOK_REPLAY_HANDLERS: Record<string, (payload: any) => Promise<unknown>> = {
  'twilio-call': (payload: TwilioCallPayload) => CallToJobService.processTwilioCall(payload),
  'vapi-call': (payload: VapiCallPayload) => CallToJobService.processVapiCall(payload),
}

export async function replayPendingWebhooks(limit = 10) {
  const pending = await WebhookInboxService.getPendingBatch(limit)
  let processed = 0
  let failed = 0

  for (const row of pending) {
    const handler = WEBHOOK_REPLAY_HANDLERS[row.provider]
    if (!handler) {
      await WebhookInboxService.markFailed(row.id, `No replay handler for provider "${row.provider}"`)
      failed++
      continue
    }

    try {
      await handler(row.payload)
      await WebhookInboxService.markProcessed(row.id)
      processed++
    } catch (err) {
      console.error(`[WebhookReplay] ${row.provider} ${row.eventId} failed:`, err)
      await WebhookInboxService.recordAttemptFailure(row.id, row.attempts, String(err))
      failed++
    }
  }

  return { processed, failed }
}

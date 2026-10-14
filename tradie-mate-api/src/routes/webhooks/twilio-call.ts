import { FastifyRequest, FastifyReply } from 'fastify'
import twilio from 'twilio'
import { env } from '../../config/env'
import { CallToJobService, TwilioCallPayload } from '../../services/call-to-job.service'
import { WebhookInboxService } from '../../services/webhook-inbox.service'

export async function twilioCallWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  // Validate Twilio signature
  const twilioSignature = request.headers['x-twilio-signature'] as string | undefined

  if (!twilioSignature || env.NODE_ENV === 'production') {
    const isValid = twilio.validateRequest(
      env.TWILIO_AUTH_TOKEN,
      twilioSignature || '',
      `https://api.tradiemate.com.au/api/v1/webhooks/twilio-call`,
      request.body as any
    )

    if (!isValid && env.NODE_ENV === 'production') {
      request.log.warn('Invalid Twilio signature on call webhook')
      return reply.status(403).send({ error: 'Invalid Twilio signature' })
    }
  }

  const body = request.body as Record<string, string>
  const callSid = body.CallSid || body.TranscriptionSid || `MOCK-${Date.now()}`
  const fromNumber = body.From || body.Caller || ''
  const toNumber = body.To || body.Called || env.TWILIO_FROM_NUMBER
  const transcriptionText = body.TranscriptionText || body.SpeechResult || ''

  request.log.info({ callSid, from: fromNumber }, 'Twilio call webhook received')

  // Acknowledge Twilio immediately
  reply.status(200).send({ success: true, data: { received: true } })

  // Process asynchronously. Twilio has already been acknowledged, so a failure
  // goes to the webhook inbox where the replay worker retries it.
  const payload: TwilioCallPayload = {
    callSid,
    from: fromNumber,
    to: toNumber,
    transcript: transcriptionText,
  }
  setImmediate(async () => {
    try {
      await CallToJobService.processTwilioCall(payload)
    } catch (err) {
      request.log.error({ err, callSid }, 'Failed to process Twilio call — saving for replay')
      await WebhookInboxService.ingest({ provider: 'twilio-call', eventId: callSid, payload })
        .catch((ingestErr) => request.log.error({ ingestErr, callSid }, 'Failed to save Twilio call for replay'))
    }
  })
}

import { FastifyRequest, FastifyReply } from 'fastify'
import twilio from 'twilio'
import { db } from '../../config/db'
import { callLogs } from '../../db/schema/calls'
import { jobs } from '../../db/schema/jobs'
import { tradies } from '../../db/schema/tradies'
import { eq } from 'drizzle-orm'
import { env } from '../../config/env'
import { fcm } from '../../config/firebase'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY || '' })

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

  // Process asynchronously
  setImmediate(async () => {
    try {
      await processCall(callSid, fromNumber, toNumber, transcriptionText, request)
    } catch (err) {
      request.log.error({ err, callSid }, 'Failed to process Twilio call')
    }
  })
}

async function processCall(
  callSid: string,
  fromNumber: string,
  toNumber: string,
  transcriptionText: string,
  request: FastifyRequest
) {
  // Find tradie by their Twilio number
  const [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.twilioNumber, toNumber))
    .limit(1)

  if (!tradie) {
    request.log.warn({ toNumber }, 'No tradie found for this Twilio number')
    return
  }

  // Log the call
  const callStartedAt = new Date()
  const [callLog] = await db
    .insert(callLogs)
    .values({
      tradieId: tradie.id,
      callSid,
      from: fromNumber,
      to: toNumber,
      transcript: transcriptionText || null,
      jobCreated: false,
      callStartedAt,
      createdAt: callStartedAt,
    })
    .returning()

  if (!transcriptionText) {
    request.log.info({ callSid }, 'Call received with no transcription — storing call log only')
    return
  }

  // Extract job details using LLM
  let extractedData: any = null
  if (env.OPENAI_API_KEY) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an assistant that extracts job booking details from Australian tradie voicemail transcripts.
Extract the following fields and return ONLY valid JSON (no markdown):
{
  "customerName": "string or null",
  "customerPhone": "string or null",
  "jobDescription": "string",
  "address": "string or null",
  "suburb": "string or null",
  "urgency": "EMERGENCY | TODAY | THIS_WEEK | FLEXIBLE",
  "confidence": 0-100
}`,
          },
          {
            role: 'user',
            content: `Transcript: "${transcriptionText}"\nCaller phone: ${fromNumber}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 300,
      })

      const raw = completion.choices[0]?.message?.content?.trim() || ''
      extractedData = JSON.parse(raw)
    } catch (llmErr) {
      request.log.warn({ llmErr }, 'LLM extraction failed — using raw transcript')
      extractedData = {
        customerName: null,
        customerPhone: fromNumber,
        jobDescription: transcriptionText,
        address: null,
        suburb: null,
        urgency: 'FLEXIBLE',
        confidence: 0,
      }
    }
  } else {
    extractedData = {
      customerName: null,
      customerPhone: fromNumber,
      jobDescription: transcriptionText,
      address: null,
      suburb: null,
      urgency: 'FLEXIBLE',
      confidence: 0,
    }
  }

  // Create DRAFT job
  const [draftJob] = await db
    .insert(jobs)
    .values({
      tradieId: tradie.id,
      title: extractedData.jobDescription?.slice(0, 100) || 'Call-to-Job Draft',
      description: transcriptionText,
      jobType: 'Call-to-Job',
      status: 'DRAFT',
      urgency: (extractedData.urgency as any) || 'FLEXIBLE',
      source: 'PHONE_CALL',
      address: extractedData.address || extractedData.suburb || 'Address TBC',
      notes: `Caller: ${fromNumber}\nExtracted: ${JSON.stringify(extractedData, null, 2)}`,
      callLogId: callLog.id,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: tomorrow
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  // Update call log with processed data
  await db
    .update(callLogs)
    .set({
      extractedData,
      processedAt: new Date(),
      jobCreated: true,
      jobId: draftJob.id,
    })
    .where(eq(callLogs.id, callLog.id))

  // Send FCM push notification to tradie
  if (tradie.fcmToken) {
    try {
      await fcm.send({
        token: tradie.fcmToken,
        notification: {
          title: 'New Call-to-Job',
          body: `Call from ${fromNumber}: "${extractedData.jobDescription?.slice(0, 80) || transcriptionText.slice(0, 80)}"`,
        },
        data: {
          type: 'CALL_JOB_CREATED',
          jobId: draftJob.id,
          callLogId: callLog.id,
          from: fromNumber,
        },
        android: { priority: 'high' },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'CALL_JOB',
            },
          },
        },
      })
    } catch (fcmErr) {
      request.log.warn({ fcmErr, tradieId: tradie.id }, 'FCM notification failed for call-to-job')
    }
  }

  request.log.info({ jobId: draftJob.id, tradieId: tradie.id }, 'Call-to-job draft created')
}

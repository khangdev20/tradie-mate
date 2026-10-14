import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { db } from '../config/db'
import { env } from '../config/env'
import { callLogs } from '../db/schema/calls'
import { jobs } from '../db/schema/jobs'
import { tradies } from '../db/schema/tradies'
import { voiceAgentConfigs } from '../db/schema/webhooks'
import { NotificationService } from './notification.service'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY || '' })

const URGENCIES = ['EMERGENCY', 'TODAY', 'THIS_WEEK', 'FLEXIBLE'] as const
type Urgency = (typeof URGENCIES)[number]

export interface ExtractedJobDetails {
  customerName: string | null
  customerPhone: string | null
  jobDescription: string
  address: string | null
  suburb: string | null
  urgency: Urgency
  confidence: number
}

export interface TwilioCallPayload {
  callSid: string
  from: string
  to: string
  transcript: string
}

export interface VapiCallPayload {
  callId: string
  transcript: string
  callerNumber: string
  tradieNumber?: string | null
  assistantId?: string | null
  recordingUrl?: string | null
}

const EXTRACTION_PROMPT = `You are an assistant that extracts job booking details from Australian tradie call transcripts.
Extract the following fields and return ONLY valid JSON (no markdown):
{
  "customerName": "string or null",
  "customerPhone": "string or null",
  "jobDescription": "string",
  "address": "string or null",
  "suburb": "string or null",
  "urgency": "EMERGENCY | TODAY | THIS_WEEK | FLEXIBLE",
  "confidence": 0-100
}`

/** Fallback used when no LLM is configured or its answer is unusable. */
export function rawTranscriptDetails(transcript: string, callerNumber: string): ExtractedJobDetails {
  return {
    customerName: null,
    customerPhone: callerNumber || null,
    jobDescription: transcript,
    address: null,
    suburb: null,
    urgency: 'FLEXIBLE',
    confidence: 0,
  }
}

/** Coerce an LLM answer into a safe shape; anything missing falls back to the raw transcript. */
export function normaliseExtraction(raw: unknown, transcript: string, callerNumber: string): ExtractedJobDetails {
  const fallback = rawTranscriptDetails(transcript, callerNumber)
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Record<string, unknown>
  const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

  return {
    customerName: str(r.customerName),
    customerPhone: str(r.customerPhone) ?? fallback.customerPhone,
    jobDescription: str(r.jobDescription) ?? transcript,
    address: str(r.address),
    suburb: str(r.suburb),
    urgency: URGENCIES.includes(r.urgency as Urgency) ? (r.urgency as Urgency) : 'FLEXIBLE',
    confidence: typeof r.confidence === 'number' ? r.confidence : 0,
  }
}

export async function extractJobDetails(transcript: string, callerNumber: string): Promise<ExtractedJobDetails> {
  if (!env.OPENAI_API_KEY) return rawTranscriptDetails(transcript, callerNumber)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Transcript: "${transcript}"\nCaller phone: ${callerNumber}` },
      ],
      temperature: 0.1,
      max_tokens: 300,
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    return normaliseExtraction(JSON.parse(raw), transcript, callerNumber)
  } catch (err) {
    console.warn('[CallToJob] LLM extraction failed — using raw transcript:', err)
    return rawTranscriptDetails(transcript, callerNumber)
  }
}

export class CallToJobService {
  /**
   * Log a call and turn its transcript into a DRAFT job the tradie confirms.
   * Idempotent per callSid, so webhook retries and inbox replays are safe.
   */
  static async createDraftJobFromCall(params: {
    tradieId: string
    callSid: string
    from: string
    to: string
    transcript: string
    recordingUrl?: string | null
  }) {
    const [existing] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.callSid, params.callSid))
      .limit(1)

    if (existing?.jobCreated) return { jobId: existing.jobId, created: false }

    const now = new Date()
    const callLog = existing ?? (
      await db
        .insert(callLogs)
        .values({
          tradieId: params.tradieId,
          callSid: params.callSid,
          from: params.from,
          to: params.to,
          transcript: params.transcript || null,
          recordingUrl: params.recordingUrl ?? null,
          jobCreated: false,
          callStartedAt: now,
          createdAt: now,
        })
        .returning()
    )[0]

    if (!params.transcript.trim()) return { jobId: null, created: false }

    const details = await extractJobDetails(params.transcript, params.from)

    const [draftJob] = await db
      .insert(jobs)
      .values({
        tradieId: params.tradieId,
        title: details.jobDescription.slice(0, 100) || 'Call-to-Job Draft',
        description: params.transcript,
        jobType: 'Call-to-Job',
        status: 'DRAFT',
        urgency: details.urgency,
        source: 'PHONE_CALL',
        address: details.address || details.suburb || 'Address TBC',
        notes: `Caller: ${params.from}\nExtracted: ${JSON.stringify(details, null, 2)}`,
        callLogId: callLog.id,
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Default: tomorrow
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    await db
      .update(callLogs)
      .set({ extractedData: details, processedAt: new Date(), jobCreated: true, jobId: draftJob.id })
      .where(eq(callLogs.id, callLog.id))

    const who = details.customerName || params.from || 'a caller'
    await NotificationService.notifyTradie(params.tradieId, {
      type: 'CALL_JOB_CREATED',
      title: 'New job from a call',
      body: `New job from ${who} — tap to confirm: "${details.jobDescription.slice(0, 80)}"`,
      data: { jobId: draftJob.id, callLogId: callLog.id, from: params.from },
    })

    return { jobId: draftJob.id, created: true }
  }

  static async processTwilioCall(payload: TwilioCallPayload) {
    const [tradie] = await db
      .select({ id: tradies.id })
      .from(tradies)
      .where(eq(tradies.twilioNumber, payload.to))
      .limit(1)

    if (!tradie) {
      console.warn(`[CallToJob] No tradie found for Twilio number ${payload.to}`)
      return { jobId: null, created: false }
    }

    return this.createDraftJobFromCall({
      tradieId: tradie.id,
      callSid: payload.callSid,
      from: payload.from,
      to: payload.to,
      transcript: payload.transcript,
    })
  }

  static async processVapiCall(payload: VapiCallPayload) {
    const tradieId = await this.findTradieForVapiCall(payload)
    if (!tradieId) {
      console.warn(`[CallToJob] No tradie found for Vapi call ${payload.callId}`)
      return { jobId: null, created: false }
    }

    return this.createDraftJobFromCall({
      tradieId,
      callSid: `vapi-${payload.callId}`,
      from: payload.callerNumber,
      to: payload.tradieNumber || '',
      transcript: payload.transcript,
      recordingUrl: payload.recordingUrl,
    })
  }

  private static async findTradieForVapiCall(payload: VapiCallPayload): Promise<string | null> {
    if (payload.assistantId) {
      const [config] = await db
        .select({ tradieId: voiceAgentConfigs.tradieId })
        .from(voiceAgentConfigs)
        .where(eq(voiceAgentConfigs.vapiAssistantId, payload.assistantId))
        .limit(1)
      if (config) return config.tradieId
    }

    if (payload.tradieNumber) {
      const [tradie] = await db
        .select({ id: tradies.id })
        .from(tradies)
        .where(eq(tradies.twilioNumber, payload.tradieNumber))
        .limit(1)
      if (tradie) return tradie.id
    }

    return null
  }
}

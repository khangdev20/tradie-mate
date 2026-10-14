import { db } from '../config/db'
import { rawWebhooks } from '../db/schema/webhooks'
import { eq, and, lt } from 'drizzle-orm'
import crypto from 'crypto'

export class WebhookInboxService {
  static async ingest(params: {
    provider: string
    eventId?: string
    signature?: string
    payload: unknown
  }): Promise<string> {
    if (params.eventId) {
      const [existing] = await db
        .select({ id: rawWebhooks.id })
        .from(rawWebhooks)
        .where(and(eq(rawWebhooks.provider, params.provider), eq(rawWebhooks.eventId, params.eventId)))
        .limit(1)
      if (existing) return existing.id
    }

    const [row] = await db
      .insert(rawWebhooks)
      .values({
        provider: params.provider,
        eventId: params.eventId ?? crypto.randomUUID(),
        signature: params.signature,
        payload: params.payload as any,
        status: 'pending',
      })
      .returning()

    return row.id
  }

  static async markProcessed(id: string) {
    await db
      .update(rawWebhooks)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(rawWebhooks.id, id))
  }

  static async markFailed(id: string, error: string) {
    await db
      .update(rawWebhooks)
      .set({ status: 'failed', lastError: error })
      .where(eq(rawWebhooks.id, id))
  }

  /** Keep the row pending for another replay, or give up after maxAttempts. */
  static async recordAttemptFailure(id: string, previousAttempts: string, error: string, maxAttempts = 5) {
    const attempts = (parseInt(previousAttempts, 10) || 0) + 1
    await db
      .update(rawWebhooks)
      .set({
        attempts: String(attempts),
        lastError: error,
        status: attempts >= maxAttempts ? 'failed' : 'pending',
      })
      .where(eq(rawWebhooks.id, id))
  }

  static async getPendingBatch(limit = 20) {
    return db
      .select()
      .from(rawWebhooks)
      .where(eq(rawWebhooks.status, 'pending'))
      .orderBy(rawWebhooks.createdAt)
      .limit(limit)
  }
}

export class WebhookSignatureVerifier {
  static verifyStripe(payload: string, signature: string, secret: string): boolean {
    try {
      const parts = signature.split(',').reduce((acc, part) => {
        const [k, v] = part.split('=')
        acc[k] = v
        return acc
      }, {} as Record<string, string>)
      const signed = `${parts.t}.${payload}`
      const expected = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex')
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v))
    } catch {
      return false
    }
  }
}

export class IdempotencyGuard {
  static key(provider: string, eventId: string) {
    return `webhook:idempotency:${provider}:${eventId}`
  }
}

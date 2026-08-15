import { db } from '../config/db'
import { analyticsEvents } from '../db/schema/webhooks'

export class AnalyticsService {
  static async ingestBatch(events: {
    tradieId?: string
    sessionId?: string
    eventName: string
    properties?: Record<string, unknown>
    platform?: string
    appVersion?: string
  }[]) {
    if (events.length === 0) return { inserted: 0 }

    await db.insert(analyticsEvents).values(
      events.map((e) => ({
        tradieId: e.tradieId ?? null,
        sessionId: e.sessionId,
        eventName: e.eventName,
        properties: e.properties ?? null,
        platform: e.platform,
        appVersion: e.appVersion,
      })),
    )

    return { inserted: events.length }
  }
}

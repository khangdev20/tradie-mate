/**
 * Analytics — batches events to POST /analytics/events
 */
import { Platform } from 'react-native'
import api from './apiService'
import { AppConfig } from '../constants/config'

export type AnalyticsEvent =
  | 'job_created'
  | 'job_detail_opened'
  | 'job_status_changed'
  | 'quick_job_started'
  | 'quick_job_completed'
  | 'invoice_created'
  | 'payment_initiated'
  | 'offline_sync_completed'
  | 'calendar_viewed'
  | 'job_rescheduled'
  | 'document_uploaded'
  | 'xero_connect_started'
  | 'xero_disconnected'
  | 'voice_agent_config_saved'
  | 'app_opened'
  | 'payment_reconciled'

type QueuedEvent = {
  eventName: AnalyticsEvent
  properties?: Record<string, unknown>
  timestamp: number
}

const queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const SESSION_ID = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function flush() {
  if (queue.length === 0) return
  const batch = queue.splice(0, 50)
  try {
    await api.post('/analytics/events', {
      events: batch.map((e) => ({
        eventName: e.eventName,
        properties: e.properties,
        sessionId: SESSION_ID,
        platform: Platform.OS,
        appVersion: '0.0.1',
      })),
    })
  } catch {
    queue.unshift(...batch)
  }
}

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, properties ?? {})
  }

  queue.push({ eventName: event, properties, timestamp: Date.now() })

  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, 2000)
}

export async function flushAnalytics() {
  if (flushTimer) clearTimeout(flushTimer)
  await flush()
}

if (AppConfig.sentryDsn) {
  // Sentry breadcrumbs can be added when initialized in App.tsx
}

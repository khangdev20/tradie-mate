/**
 * Analytics event tracking for Phase 1 modules.
 * Events are logged in development and can be forwarded to a backend later.
 */
export type AnalyticsEvent =
  | 'job_created'
  | 'job_detail_opened'
  | 'job_status_changed'
  | 'quick_job_started'
  | 'quick_job_completed'
  | 'invoice_created'
  | 'payment_initiated'
  | 'offline_sync_completed'

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, properties ?? {})
  }
}

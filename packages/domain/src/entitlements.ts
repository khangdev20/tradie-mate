export const ENTITLEMENT_KEYS = [
  'tapToPayEnabled',
  'customerTrackingEnabled',
  'reviewRequestsEnabled',
  'xeroSyncEnabled',
  'callToJobEnabled',
  'aiVoiceEnabled',
  'maxJobsPerMonth',
  'maxInvoicesPerMonth',
  'teamMembersLimit',
] as const

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number]

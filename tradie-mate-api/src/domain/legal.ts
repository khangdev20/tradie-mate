/** Must match tradie-mate-web/src/legal/constants.ts LEGAL_VERSIONS */
export const CURRENT_LEGAL_VERSIONS = {
  terms: '2026-06-02',
  privacy: '2026-06-02',
  disclaimer: '2026-06-02',
} as const

export type LegalConsentInput = {
  terms_version: string
  privacy_version: string
  disclaimer_version: string
  accepted_at?: string
}

export function validateLegalConsent(consent: LegalConsentInput | undefined): string | null {
  if (!consent) return 'LEGAL_CONSENT_REQUIRED'
  if (consent.terms_version !== CURRENT_LEGAL_VERSIONS.terms) return 'TERMS_VERSION_MISMATCH'
  if (consent.privacy_version !== CURRENT_LEGAL_VERSIONS.privacy) return 'PRIVACY_VERSION_MISMATCH'
  if (consent.disclaimer_version !== CURRENT_LEGAL_VERSIONS.disclaimer) return 'DISCLAIMER_VERSION_MISMATCH'
  return null
}

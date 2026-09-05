import { eq } from 'drizzle-orm'
import { db } from '../config/db'
import { tradies, tradieAuthMethods, onboardingEvents } from '../db/schema/tradies'
import { tradeDocuments } from '../db/schema/documents'
import { ABNService } from './abn.service'
import { validateLegalConsent, type LegalConsentInput } from '../domain/legal'

export type OnboardingStatus =
  | 'PHONE_PENDING'
  | 'PHONE_VERIFIED'
  | 'PROFILE_SUBMITTED'
  | 'DOCS_IN_PROGRESS'
  | 'DOCS_SUBMITTED'
  | 'APPROVED_FOR_BETA'
  | 'MANUAL_REVIEW'

export type ResumeStep =
  | 'trade'
  | 'personal'
  | 'verify'
  | 'business'
  | 'review'
  | 'tracking'
  | 'complete'

export interface CompleteProfileInput {
  authUserId: string
  first_name: string
  last_name: string
  email: string
  phone: string
  trade_type: string
  business_name: string
  abn: string
  has_public_liability: boolean
  experience_years?: string
  legal_consent: LegalConsentInput
}

export interface OnboardingStatusResult {
  onboarding_status: OnboardingStatus
  resume_step: ResumeStep
  tradie: {
    first_name: string
    last_name?: string
    trade_type: string
    abn_verified: boolean
    abn_verification_status: string
    business_name?: string
  } | null
  documents: Array<{
    doc_type: string
    status: string
    file_name?: string
    expires_at?: string
  }>
  required_documents: string[]
  can_access_app: boolean
  blockers: string[]
}

const REQUIRED_DOCS = ['TRADE_LICENCE', 'PUBLIC_LIABILITY_INSURANCE']

const VALID_TRADE_TYPES = [
  'PLUMBER', 'ELECTRICIAN', 'CARPENTER',
  'HVAC', 'PAINTER', 'TILER', 'ROOFER', 'OTHER',
]

export class OnboardingService {
  /**
   * Complete tradie profile after phone OTP verification.
   * Creates the tradie row and validates ABN.
   */
  static async completeProfile(input: CompleteProfileInput) {
    const {
      authUserId,
      first_name,
      last_name,
      email,
      phone,
      trade_type,
      business_name,
      abn,
      has_public_liability,
      experience_years,
      legal_consent,
    } = input

    // 1. Reject if tradie already exists for this authUserId
    const [existing] = await db
      .select({ id: tradies.id })
      .from(tradies)
      .where(eq(tradies.authUserId, authUserId))
      .limit(1)

    if (existing) {
      // Idempotent: return existing tradie data
      const [tradie] = await db.select().from(tradies).where(eq(tradies.id, existing.id)).limit(1)
      return {
        tradie_id: tradie.id,
        onboarding_status: tradie.onboardingStatus as OnboardingStatus,
        abn_entity_name: tradie.abnEntityName,
        next_url: '/tradie-tracking',
        already_existed: true,
      }
    }

    // 2. Validate trade_type
    if (!VALID_TRADE_TYPES.includes(trade_type.toUpperCase())) {
      throw Object.assign(new Error(`Invalid trade type: ${trade_type}`), { code: 'INVALID_TRADE_TYPE', status: 400 })
    }

    // 3. Validate ABN Luhn
    if (!ABNService.validateLuhn(abn)) {
      throw Object.assign(new Error('Invalid ABN checksum'), { code: 'ABN_INVALID', status: 400 })
    }

    // 4. Validate legal consent
    const legalError = validateLegalConsent(legal_consent)
    if (legalError) {
      throw Object.assign(new Error(legalError), { code: legalError, status: 400 })
    }

    // 5. ABN lookup with Redis cache
    let abnEntityName: string | null = null
    let abnGstRegistered = false
    let abnVerifiedAt: Date | null = null
    let abnVerificationStatus = 'UNVERIFIED'

    const abnDetails = await ABNService.lookup(abn)

    if (abnDetails === null) {
      // ABR API is down — allow with PENDING_MANUAL_REVIEW
      abnVerificationStatus = 'PENDING_MANUAL_REVIEW'
    } else if (!abnDetails.active) {
      throw Object.assign(
        new Error('ABN is inactive or cancelled at the Australian Business Register'),
        { code: 'ABN_INACTIVE', status: 400 }
      )
    } else {
      abnEntityName = abnDetails.entityName
      abnGstRegistered = abnDetails.gstRegistered
      abnVerifiedAt = new Date()
      abnVerificationStatus = 'VERIFIED'
    }

    // 6. Insert tradie row
    const now = new Date()
    const [tradie] = await db
      .insert(tradies)
      .values({
        authUserId,
        firstName: first_name,
        lastName: last_name,
        email: email || null,
        phone: phone || null,
        tradeType: trade_type.toUpperCase() as any,
        businessName: business_name,
        abn: ABNService.clean(abn),
        abnVerifiedAt: abnVerifiedAt ?? undefined,
        abnEntityName: abnEntityName ?? undefined,
        abnGstRegistered,
        abnVerificationStatus,
        hasPublicLiabilityDeclared: has_public_liability,
        experienceYears: experience_years,
        onboardingStatus: 'PROFILE_SUBMITTED',
        isActive: true,
        isOnboarded: false,
        // Legal consent
        termsAcceptedAt: now,
        termsVersion: legal_consent.terms_version,
        privacyAcceptedAt: now,
        privacyVersion: legal_consent.privacy_version,
        disclaimerAcceptedAt: now,
        disclaimerVersion: legal_consent.disclaimer_version,
      })
      .returning()

    // 7. Record phone auth method
    await db.insert(tradieAuthMethods).values({
      tradieId: tradie.id,
      provider: 'phone',
      providerId: authUserId,
      phone,
      isPrimary: true,
    }).onConflictDoNothing()

    // 8. Emit audit event
    await db.insert(onboardingEvents).values({
      tradieId: tradie.id,
      step: 'PROFILE_SUBMITTED',
      metadata: JSON.stringify({
        trade_type,
        abn_status: abnVerificationStatus,
      }),
    })

    return {
      tradie_id: tradie.id,
      onboarding_status: 'PROFILE_SUBMITTED' as OnboardingStatus,
      abn_entity_name: abnEntityName,
      abn_verification_status: abnVerificationStatus,
      next_url: '/tradie-tracking',
      already_existed: false,
    }
  }

  /**
   * Get current onboarding status for a user.
   * Derives status from tradie row + documents.
   */
  static async getStatus(authUserId: string): Promise<OnboardingStatusResult> {
    const [tradie] = await db
      .select()
      .from(tradies)
      .where(eq(tradies.authUserId, authUserId))
      .limit(1)

    if (!tradie) {
      return {
        onboarding_status: 'PHONE_VERIFIED',
        resume_step: 'business',
        tradie: null,
        documents: [],
        required_documents: REQUIRED_DOCS,
        can_access_app: false,
        blockers: [],
      }
    }

    // Get uploaded documents
    const uploadedDocs = await db
      .select()
      .from(tradeDocuments)
      .where(eq(tradeDocuments.tradieId, tradie.id))

    // Build document list with MISSING synthesized
    const docMap = new Map(uploadedDocs.map(d => [d.docType, d]))
    const documents = REQUIRED_DOCS.map(docType => {
      const doc = docMap.get(docType as any)
      if (!doc) return { doc_type: docType, status: 'MISSING' }
      return {
        doc_type: doc.docType,
        status: doc.status,
        expires_at: doc.expiresAt?.toISOString(),
      }
    })

    // Derive onboarding status
    const rawStatus = tradie.onboardingStatus as OnboardingStatus
    const missingDocs = documents.filter(d => d.status === 'MISSING')
    const allDocsUploaded = missingDocs.length === 0

    let derivedStatus: OnboardingStatus = rawStatus
    if (rawStatus === 'PROFILE_SUBMITTED' && uploadedDocs.length > 0) {
      derivedStatus = allDocsUploaded ? 'DOCS_SUBMITTED' : 'DOCS_IN_PROGRESS'
    }

    // Determine resume step
    const resumeStep = OnboardingService.deriveResumeStep(derivedStatus)

    // Compute blockers
    const blockers: string[] = []
    if (tradie.abnVerificationStatus === 'PENDING_MANUAL_REVIEW') blockers.push('ABN_MANUAL_REVIEW')
    for (const doc of documents) {
      if (doc.status === 'MISSING') blockers.push(`DOC_${doc.doc_type}_MISSING`)
    }

    return {
      onboarding_status: derivedStatus,
      resume_step: resumeStep,
      tradie: {
        first_name: tradie.firstName,
        last_name: tradie.lastName,
        trade_type: tradie.tradeType,
        abn_verified: !!tradie.abnVerifiedAt,
        abn_verification_status: tradie.abnVerificationStatus,
        business_name: tradie.businessName ?? undefined,
      },
      documents,
      required_documents: REQUIRED_DOCS,
      can_access_app: tradie.isOnboarded,
      blockers,
    }
  }

  private static deriveResumeStep(status: OnboardingStatus): ResumeStep {
    switch (status) {
      case 'PHONE_PENDING': return 'verify'
      case 'PHONE_VERIFIED': return 'business'
      case 'PROFILE_SUBMITTED': return 'tracking'
      case 'DOCS_IN_PROGRESS': return 'tracking'
      case 'DOCS_SUBMITTED': return 'tracking'
      case 'APPROVED_FOR_BETA': return 'complete'
      case 'MANUAL_REVIEW': return 'tracking'
      default: return 'trade'
    }
  }

  /**
   * Update onboarding status when documents change.
   */
  static async refreshDocumentStatus(tradieId: string) {
    const docs = await db
      .select()
      .from(tradeDocuments)
      .where(eq(tradeDocuments.tradieId, tradieId))

    const uploadedRequiredTypes = docs
      .filter(d => REQUIRED_DOCS.includes(d.docType))
      .map(d => d.docType)

    const allRequiredUploaded = REQUIRED_DOCS.every(t => uploadedRequiredTypes.includes(t as any))

    if (allRequiredUploaded) {
      await db
        .update(tradies)
        .set({ onboardingStatus: 'DOCS_SUBMITTED', updatedAt: new Date() })
        .where(eq(tradies.id, tradieId))
    } else if (docs.length > 0) {
      await db
        .update(tradies)
        .set({ onboardingStatus: 'DOCS_IN_PROGRESS', updatedAt: new Date() })
        .where(eq(tradies.id, tradieId))
    }
  }
}

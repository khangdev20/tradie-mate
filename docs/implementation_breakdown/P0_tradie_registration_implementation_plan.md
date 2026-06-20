# P0 — Tradie Registration & Onboarding (Web + API)

**Priority:** P0 — highest. Blocks beta tradie acquisition, Phase 1 activation metrics, and all authenticated product flows.  
**Status:** Planning (not started in production path)  
**Owners:** API + `tradie-mate-web` (mobile aligns after web path is stable)  
**Related modules:** [1.3 Phone OTP & ABN](./phase_1_build_seed/03_module_1_3_phone_otp_auth_abn_validation.md) (canonical rules), [2.2 Document Verification](./phase_2_transition_grow/02_module_2_2_tradie_onboarding_document_verification.md) (MVP slice only)  
**UI prototypes:** `tradie-mate-web/src/pages/TradieRegistration.tsx`, `ApplicationTracking.tsx`

**Detailed flow, validation & UX:** [P0 Tradie Registration — Flow, Validation & UX](./P0_tradie_registration_flow_validation_ux.md) (step-by-step screens, validation matrix, state machine, copy, QA).

---

## 1. Executive summary

Tradie registration today is **split and incomplete**:

| Surface | State |
| --- | --- |
| Web `/tradie-onboarding` | 4-step UI mock — no API, fake redirect |
| Web `/tradie-tracking` | Document dashboard mock — no upload API |
| API `POST /auth/otp/*` | Works via Supabase; returns `is_new_user` |
| API `POST /tradies/register` | **Broken for new OTP users** — `requireAuth` requires existing `tradies` row |
| API `POST /auth/email/register` | Creates auth + tradie in one shot (bypasses web flow) |
| Mobile `RegisterScreen` | Email/password only — not aligned with OTP-first GTM |

**P0 delivers one end-to-end path:** Landing → multi-step web form → phone OTP → ABN verify → tradie profile created → document checklist portal → deep link to download mobile app.

**Out of P0 (defer):** Full OCR auto-approval, admin review dashboard, Google/Apple SSO on web, marketplace eligibility, subscription paywall during signup.

---

## 2. Product goals

### Primary intention
*"I saw TradieMate online — let me apply quickly and prove I'm a real tradie business without calling support."*

### Success metrics (beta — 4 weeks after launch)

| Metric | Target |
| --- | --- |
| Web form start → OTP verified | ≥ 55% |
| OTP verified → profile submitted (ABN pass) | ≥ 70% |
| Profile submitted → ≥1 document uploaded | ≥ 50% |
| Median time landing → profile submitted | < 8 minutes |
| Support tickets for "can't sign up" | < 5% of new applicants |

### Phase 1 exit criteria this unlocks
- 50 beta tradies onboarded (Brisbane)
- ≥30 with ABN verified
- Activation without human concierge for happy path

---

## 3. Recommended user journey (web-first)

> Full step UX, field-level validation, error branches, resume logic, and copy deck: **[Flow, Validation & UX spec](./P0_tradie_registration_flow_validation_ux.md)**.

```mermaid
flowchart TD
  A[Landing /tradie-onboarding] --> B[Step 1: Trade category]
  B --> C[Step 2: Personal + AU phone + email]
  C --> D[Step 3: OTP verify 6-digit]
  D --> E[Step 4: Business name + ABN + PL intent]
  E --> F[Step 5: Review + Submit]
  F --> G[API: create tradie + verify ABN]
  G --> H[/tradie-tracking document portal]
  H --> I[Upload licence + PL PDF/photo]
  I --> J[CTA: Download app + magic link SMS]
```

### Step summary (see UX doc for screens & copy)

| Step | Fields | Validation (high level) |
| --- | --- | --- |
| 1 Trade | `tradeType`, optional `experienceYears` | Required; enum map §9.5 |
| 2 Personal | `firstName`, `lastName`, `email`, `phone` | Zod + E.164; triggers OTP send |
| 3 OTP | 6-digit code | 3/10min rate limit; 60s resend |
| 4 Business | `businessName`, `abn`, `hasPublicLiability` | Luhn + `/onboarding/abn/validate` |
| 5 Review | Summary + legal consent | All checkboxes; `POST /onboarding/profile` |
| Portal | `TRADE_LICENCE`, `PUBLIC_LIABILITY_INSURANCE` | Multipart ≤10MB; auth required |

**Progressive rule (from 1.3):** Do not block OTP on ABN. Do not require documents before profile exists. Set `isOnboarded: false` until minimum docs uploaded (configurable).

---

## 4. Onboarding state machine

Store on `tradies` + optional `onboarding_events` audit table.

```
PHONE_PENDING → PHONE_VERIFIED → PROFILE_SUBMITTED → DOCS_IN_PROGRESS → DOCS_SUBMITTED → APPROVED_FOR_BETA
                                                      ↘ MANUAL_REVIEW (admin)
```

| State | `tradies` flags / columns | User can access |
| --- | --- | --- |
| `PHONE_PENDING` | Supabase user may exist; no tradie row | OTP endpoints only |
| `PHONE_VERIFIED` | JWT issued; no tradie row | `POST /onboarding/profile` |
| `PROFILE_SUBMITTED` | Row exists; `abnVerifiedAt` set or `abnPendingReview` | `/tradie-tracking`, document upload |
| `DOCS_IN_PROGRESS` | ≥1 doc `PENDING` | Portal + read-only app teaser |
| `DOCS_SUBMITTED` | Required types uploaded | Wait for review / auto |
| `APPROVED_FOR_BETA` | `isOnboarded: true` | Full app (jobs, invoice) per entitlements |

**P0 minimum to mark `isOnboarded: true`:** `TRADE_LICENCE` + `PUBLIC_LIABILITY_INSURANCE` uploaded (status `PENDING` acceptable for beta; manual review OK).

---

## 5. Critical API fix (blocker)

`POST /tradies/register` uses `requireAuth`, which returns `403 TRADIE_NOT_FOUND` when no tradie exists — **new OTP users cannot complete registration**.

### Required middleware

```typescript
// requireAuthUser.ts — JWT valid, tradie optional
export const requireAuthUser = async (request, reply) => {
  // validate Supabase JWT → request.user
  // optionally attach request.tradie if exists
}

// requireAuth — unchanged: JWT + tradie required (jobs, invoices, …)
```

| Route | Middleware |
| --- | --- |
| `POST /auth/otp/send`, `/auth/otp/verify` | Public |
| `POST /onboarding/profile` | `requireAuthUser` |
| `GET /onboarding/status` | `requireAuthUser` |
| `POST /documents/upload` | `requireAuthUser` + tradie exists |
| `POST /tradies/register` | Deprecate or alias → `onboarding/profile` |

---

## 6. API specification (P0)

Base path: `/` (match current app; add `/api/v1` alias later if needed).  
Response envelope: use existing `responseWrapperPlugin` (`success`, `data`, `error`).

### 6.1 `POST /auth/otp/send`

**Body:** `{ "phone": "+61412345678" }`  
**Logic:** Existing `sendOtpHandler` — keep Redis rate limit.  
**Change:** Normalize phone to E.164 in service layer.

### 6.2 `POST /auth/otp/verify`

**Body:** `{ "phone": "+614…", "otp": "123456" }`  
**Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    "is_new_user": true,
    "tradie_id": null,
    "onboarding_status": "PHONE_VERIFIED"
  }
}
```

**Logic:** Existing handler + return `onboarding_status` derived from tradie row.

### 6.3 `POST /onboarding/profile` (NEW — core P0)

**Auth:** `Bearer` + `requireAuthUser`  
**Body:**

```json
{
  "first_name": "Dave",
  "last_name": "MacIntyre",
  "email": "dave@example.com",
  "phone": "+61412345678",
  "trade_type": "PLUMBER",
  "business_name": "Dave Plumbing Pty Ltd",
  "abn": "12345678901",
  "has_public_liability": true,
  "experience_years": "3-5"
}
```

**Business logic (`OnboardingService.completeProfile`):**

1. Reject if tradie already exists for `authUserId` → `409 PROFILE_EXISTS`
2. Validate `trade_type` enum
3. `ABNService.validateLuhn(abn)` → `400 ABN_INVALID`
4. `ABNService.lookup(abn)` with Redis cache `abr_check:{abn}` 24h
   - Inactive/cancelled → `400 ABN_INACTIVE`
   - API down → `503 ABR_UNAVAILABLE` + allow `abnVerificationStatus: PENDING_MANUAL_REVIEW` flag (beta escape hatch)
5. Insert `tradies` + `tradie_auth_methods` (`phone` primary)
6. Set `abnVerifiedAt`, `abnEntityName`, `abnGstRegistered` from ATO response
7. Emit analytics `tradie_profile_submitted`
8. Return `tradie_id`, `onboarding_status: PROFILE_SUBMITTED`

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "tradie_id": "uuid",
    "onboarding_status": "PROFILE_SUBMITTED",
    "abn_entity_name": "DAVE PLUMBING PTY LTD",
    "next_url": "/tradie-tracking"
  }
}
```

### 6.4 `GET /onboarding/status` (NEW)

**Auth:** `requireAuthUser`  
**Response:**

```json
{
  "success": true,
  "data": {
    "onboarding_status": "DOCS_IN_PROGRESS",
    "tradie": { "first_name": "Dave", "trade_type": "PLUMBER", "abn_verified": true },
    "documents": [
      { "doc_type": "LICENCE", "status": "PENDING", "expires_at": "2027-01-01" },
      { "doc_type": "LIABILITY_INSURANCE", "status": "MISSING" }
    ],
    "required_documents": ["TRADE_LICENCE", "PUBLIC_LIABILITY_INSURANCE"],
    "can_access_app": false
  }
}
```

### 6.5 `POST /documents/upload` (MVP slice of 2.2)

**Auth:** `requireAuthUser` + tradie exists  
**Content-Type:** `multipart/form-data` — `file`, `doc_type`  
**Logic:**

1. Validate `doc_type` ∈ `TRADE_LICENCE | PUBLIC_LIABILITY_INSURANCE` (P0 only; extend later)
2. Upload to S3 `ap-southeast-2` via storage adapter
3. Insert `trade_documents` status `PENDING`
4. Queue OCR job (BullMQ) — **worker can no-op in P0** and leave `PENDING` for manual review
5. Return `202` with `document_id`, `status`

### 6.6 `POST /onboarding/abn/validate` (optional UX helper)

**Auth:** Public or `requireAuthUser`  
**Body:** `{ "abn": "12345678901" }`  
**Response:** `{ "valid": true, "entity_name": "...", "active": true }` for inline form feedback (debounced on web).

---

## 7. Database changes

### 7.1 `tradies` — add columns (migration)

| Column | Type | Notes |
| --- | --- | --- |
| `business_name` | `text` | Display / invoices later |
| `onboarding_status` | `varchar` or enum | State machine above |
| `abn_verification_status` | enum | `VERIFIED`, `PENDING_MANUAL_REVIEW`, `REJECTED` |
| `has_public_liability_declared` | `boolean` | Intent at signup; real verify via doc |
| `experience_years` | `varchar` | Optional marketing field |
| `beta_approved_at` | `timestamptz` | When ops approves |

### 7.1b `tradies` — legal consent (implemented)

| Column | Type | Notes |
| --- | --- | --- |
| `terms_accepted_at` | `timestamptz` | When user accepted Terms |
| `terms_version` | `varchar(32)` | e.g. `2026-06-02` — bump when Terms change |
| `privacy_accepted_at` | `timestamptz` | Privacy Policy acceptance |
| `privacy_version` | `varchar(32)` | Must match web `LEGAL_VERSIONS` |
| `disclaimer_accepted_at` | `timestamptz` | Verification Disclaimer acceptance |
| `disclaimer_version` | `varchar(32)` | Must match web `LEGAL_VERSIONS` |

Migration: `tradie-mate-api/drizzle/0002_legal_consent.sql`. API validates versions in `src/domain/legal.ts` (must stay in sync with `tradie-mate-web/src/legal/constants.ts`).

### 7.2 `onboarding_events` (NEW — audit)

```sql
id, tradie_id, step, metadata jsonb, created_at
-- step: OTP_SENT, OTP_VERIFIED, PROFILE_SUBMITTED, DOC_UPLOADED, …
```

### 7.3 `trade_documents`

Already exists — use as-is. Add `MISSING` as virtual status in API only (no row).

---

## 8. Legal documents & consent (implemented — draft copy)

> **Important:** Pages are product drafts. Obtain Australian legal review before production launch.

### 8.0 Routes & components

| Route | File | Purpose |
| --- | --- | --- |
| `/terms` | `pages/TermsPage.tsx` | Terms of Service (AU SaaS tradie focus) |
| `/privacy` | `pages/PrivacyPage.tsx` | Privacy Policy (Privacy Act 1988 / APPs) |
| `/disclaimer` | `pages/DisclaimerPage.tsx` | Verification Disclaimer (limits of “verified”) |

Shared: `src/legal/constants.ts` (version strings), `components/legal/LegalConsentFields.tsx`, `VerificationDisclaimerBanner.tsx`.

### 8.0b Registration consent UX

On **Review** step (`TradieRegistration` step 4): three required checkboxes (Terms, Privacy, Disclaimer). Submit blocked until all checked. Payload stored in `sessionStorage` (`tradiemate_legal_consent`) until `POST /onboarding/profile` or `POST /tradies/register` persists to DB.

**API body fragment:**

```json
"legal_consent": {
  "terms_version": "2026-06-02",
  "privacy_version": "2026-06-02",
  "disclaimer_version": "2026-06-02",
  "accepted_at": "2026-06-02T10:00:00.000Z"
}
```

Reject with `400` + `TERMS_VERSION_MISMATCH` (etc.) if versions do not match server `CURRENT_LEGAL_VERSIONS`.

### 8.0c Surfaces showing disclaimer

- `ApplicationTracking` — `VerificationDisclaimerBanner` at top
- Future: public profile, tracking page footer, “Verified” badges (link to `/disclaimer`)

---

## 9. Web implementation (`tradie-mate-web`)

### 9.1 File structure (new)

```
src/
  api/client.ts              # fetch + auth header from session
  api/onboarding.ts          # otp, profile, status, documents
  hooks/useOnboardingSession.ts  # tokens in sessionStorage (httpOnly cookie later)
  hooks/useAbnValidation.ts
  pages/TradieRegistration.tsx   # refactor — wire API
  pages/ApplicationTracking.tsx  # refactor — wire API
  components/onboarding/
    OtpInput.tsx
    TradeCategoryGrid.tsx
    OnboardingStepper.tsx
    DocumentChecklist.tsx
    UploadDropzone.tsx
```

### 9.2 Session storage (P0)

- After OTP verify: store `access_token`, `refresh_token`, `expires_at` in `sessionStorage`
- On profile submit: attach `Authorization: Bearer`
- **Security note:** Move to httpOnly cookie + CSRF in P1; acceptable for beta with short TTL

### 9.3 Design system alignment (required before ship)

Current web registration uses **off-brand** styling (font-black 700, thick borders, shadows). Refactor to [README design tokens](./README.md#required-tokens):

- Background `#FAFAF8`, CTA `#2E6B45`, borders `0.5px`, no shadows
- Min touch `44px`, Inter weights ≤500

### 9.4 Route map

| Route | Purpose |
| --- | --- |
| `/tradie-onboarding` | Steps 1–5 registration |
| `/tradie-onboarding/verify` | OTP sub-route or inline step |
| `/tradie-tracking` | Document portal (auth guard) |
| `/tradie-tracking?token=` | Future: magic link from SMS (P0.1) |

### 9.5 Trade category mapping

| Web label | API `trade_type` |
| --- | --- |
| Plumbing | `PLUMBER` |
| Electrical | `ELECTRICIAN` |
| Carpentry | `CARPENTER` |
| HVAC | `HVAC` |
| Landscaping | `OTHER` |
| Painting | `PAINTER` |
| Roofing | `ROOFER` |
| Other | `OTHER` |

---

## 10. Mobile alignment (P0.1 — same sprint if capacity)

| Task | Priority |
| --- | --- |
| Deep link `tradiemate://onboarding` after web signup | P0.1 |
| If `is_new_user` after OTP → navigate to profile completion (reuse fields) | P0.1 |
| Deprecate duplicate email register OR keep as fallback | P1 |
| Align `RegisterScreen` copy with web steps | P1 |

**Rule:** Web is acquisition channel; mobile is daily driver after `APPROVED_FOR_BETA`.

---

## 11. Sprint plan (3 weeks)

### Week 1 — API foundation (blockers)

| # | Task | Est. |
| --- | --- | --- |
| 1.1 | `requireAuthUser` middleware + tests | 0.5d |
| 1.2 | `OnboardingService` + `POST /onboarding/profile` | 1d |
| 1.3 | Wire `ABNService` + Redis cache + manual review flag | 0.5d |
| 1.4 | `GET /onboarding/status` | 0.5d |
| 1.5 | DB migration (`onboarding_status`, `business_name`, events table) | 0.5d |
| 1.6 | Fix OTP verify response (`onboarding_status`) | 0.25d |
| 1.7 | API integration tests (happy path + ABN fail + duplicate) | 1d |

### Week 2 — Web wiring

| # | Task | Est. |
| --- | --- | --- |
| 2.1 | API client + session hook | 0.5d |
| 2.2 | Refactor `TradieRegistration` — add OTP step, remove mock navigate | 1.5d |
| 2.3 | `POST /onboarding/abn/validate` inline feedback | 0.5d |
| 2.4 | Design system pass on onboarding pages | 1d |
| 2.5 | Refactor `ApplicationTracking` — status API + upload | 1.5d |
| 2.6 | S3 upload + `POST /documents/upload` (API) | 1d |

### Week 3 — Hardening & beta

| # | Task | Est. |
| --- | --- | --- |
| 3.1 | BullMQ OCR worker stub + manual review doc in admin (spreadsheet OK) | 1d |
| 3.2 | E2E user-flow test (Playwright): full web registration | 1d |
| 3.3 | Manual checklist (AU phone, invalid ABN, ABR down, re-submit) | 0.5d |
| 3.4 | Landing CTAs → onboarding; env docs `.env.example` | 0.25d |
| 3.5 | SMS "complete your docs" + app store link (Twilio template) | 0.5d |
| 3.6 | Beta ops runbook (approve `isOnboarded`) | 0.25d |

**Total:** ~15 dev-days (1 full-stack + part-time design review)

---

## 12. Test matrix (P0 Definition of Done)

| Layer | Cases |
| --- | --- |
| Service | ABN Luhn fail; ATO active/inactive; duplicate profile; phone normalization |
| API integration | OTP rate limit; verify → profile 201; profile without JWT 401; upload without tradie 403 |
| Web component | OTP auto-focus; resend disabled; step validation; upload progress/error |
| E2E | Landing → OTP (test phone) → ABN → tracking → upload mock file |
| Manual | Real `+61` SMS; airplane mode shows error; session refresh |

---

## 13. Environment & dependencies

| Variable | App |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | API OTP |
| `ATO_ABN_API_GUID` | ABN lookup |
| `REDIS_URL` | OTP rate limit + ABR cache |
| `AWS_S3_BUCKET`, `AWS_REGION=ap-southeast-2` | Documents |
| `VITE_API_BASE_URL` | Web |

---

## 14. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| ABR API downtime blocks signup | `PENDING_MANUAL_REVIEW` + ops queue |
| OCR cost/complexity | P0 = upload only; manual verify |
| Web session token theft | Short TTL; HTTPS only; cookie hardening in P1 |
| Supabase phone not enabled | Verify AU SMS in Supabase dashboard before Week 1 |
| Design debt on web | Allocate 1d design-system refactor in Week 2 |

---

## 15. Explicitly out of scope (P0)

- Google / Apple SSO on web (Module 2.3)
- Automated licence registry scraping (Module 4.1)
- Subscription / Stripe checkout during signup (Module 1.5 — show after `isOnboarded`)
- Public profile / reviews (Module 2.4)
- NZBN support
- Admin web UI (use DB/SQL or Retool for beta approvals)

---

## 16. Acceptance checklist (ship gate)

- [x] Terms, Privacy, and Verification Disclaimer pages live on web with cross-links
- [x] Registration requires all three consents before submit (UI)
- [x] API `POST /tradies/register` stores consent timestamps + versions (migration applied)
- [ ] Lawyer review of legal copy completed
- [ ] New user completes web flow without support intervention (happy path)
- [ ] `tradies` row created with verified ABN (or manual review flag logged)
- [ ] Document portal shows real status from API
- [ ] At least one file reaches S3 Sydney and `trade_documents` row
- [ ] `requireAuth` routes reject incomplete onboarding with clear `ONBOARDING_INCOMPLETE`
- [ ] Ops can set `is_onboarded = true` and user can open mobile app
- [ ] README / phase index links to this document

---

## 17. Document maintenance

When P0 ships:
1. Mark sections implemented in PR descriptions referencing this file.
2. Fold stable endpoints into [Module 1.3](./phase_1_build_seed/03_module_1_3_phone_otp_auth_abn_validation.md) as "Web onboarding path".
3. Split document upload details into Module 2.2 when OCR worker is production-ready.

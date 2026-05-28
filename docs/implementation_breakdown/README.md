# TradieMate — Technical Implementation Breakdown

This documentation provides a comprehensive, module-by-module breakdown of the **TradieMate Go-to-Market (GTM) Phases** (from Phase 1 to Phase 4). It translates the high-level business goals and constraints of TradieMate into structured development modules, divided between **API (Fastify Backend)** and **Mobile (React Native App)**.

---

## Product Strategy Layer — What Must Be True

The implementation plan should be judged as a business migration product, not only as a feature roadmap. Tradies will not adopt TradieMate because it has more screens. They will adopt it if it helps them win back time, get paid faster, look more professional to customers, reduce admin anxiety, and avoid losing jobs while they are on the tools.

### Primary User Intention

The core tradie intention is: **"Help me run today without admin getting in the way."**

Each feature must map to at least one of these jobs-to-be-done:

1. **Capture work**: Do not miss calls, enquiries, repeat customers, or urgent jobs.
2. **Do the job**: Know where to go, what to bring, and what was promised.
3. **Get paid**: Quote/invoice/collect payment before the customer forgets or disputes.
4. **Look professional**: Give customers tracking, receipts, reviews, and clear communication.
5. **Reduce admin**: Sync accounting, store documents, automate reminders, avoid manual re-entry.
6. **Grow from solo to team**: Move from individual workflow to staff assignment and dispatch.

### Adoption Scorecard

Every module should include an adoption evaluation before build approval:

| Criterion | Question | Minimum Evidence |
| --- | --- | --- |
| Frequency | Will a tradie use this weekly or daily? | At least 3 beta tradies describe the workflow as recurring. |
| Urgency | Does it solve a painful moment during paid work? | The feature is tied to job capture, arrival, payment, compliance, or scheduling. |
| Switching Pull | Is it clearly better than paper, SMS, Square, Xero-only, ServiceM8, Tradify, Hipages, or Airtasker? | A concrete migration benefit is documented. |
| Data Gravity | Does using it create useful history that makes leaving harder? | Jobs, customers, invoices, reviews, documents, routes, or call transcripts accumulate. |
| Monetisation Link | Does it increase willingness to pay or reduce churn? | Direct link to paid tier, transaction revenue, team seat, or retention. |
| Operational Risk | Can support handle failures safely? | Failure states, audit logs, retries, and manual override paths are defined. |

### Flexible Monetisation Model

TradieMate pricing must be implemented as a flexible subscription and entitlement system, not as hard-coded feature checks. The product should be able to change prices, bundle features, add trial offers, introduce team seats, and sell add-ons without rewriting every API route or mobile screen.

**Core principle**: features ask "does this account have the entitlement?", not "is this account on plan X?"

| Monetisation Type | Purpose | Examples |
| --- | --- | --- |
| Base subscription | Predictable SaaS revenue from solo tradies. | Starter, Pro, Team. |
| Seat-based billing | Expansion revenue as a trade business adds staff. | Extra field member, admin user, subcontractor access. |
| Add-ons | Flexible packaging for advanced features without bloating base plans. | Xero sync, call-to-job, AI voice, extra SMS bundle. |
| Usage limits | Allow trial/freemium while protecting cost-heavy features. | Jobs/month, invoices/month, tracking SMS/month, OCR scans/month. |
| Transaction revenue | Optional revenue share on payments or marketplace jobs. | Tap to Pay platform fee, escrow commission, instant payout fee. |
| Promotional overrides | Support beta users and sales-led deals. | Founder plan, 3-month discount, manually comped account. |

**Pricing flexibility rules**:
*   Store money in integer cents and Stripe price IDs in database/config; never hard-code AUD prices inside feature logic.
*   Store plan capabilities as entitlements, such as `tapToPayEnabled`, `xeroSyncEnabled`, `maxInvoicesPerMonth`, or `teamMembersLimit`.
*   Allow entitlement overrides per account for beta, support, sales, or migration deals.
*   Check subscription status at API boundaries and in mobile UI, but keep server-side enforcement authoritative.
*   Treat Stripe webhooks as the source of truth for subscription lifecycle events.
*   Keep marketplace escrow/payment commissions separate from SaaS subscription billing.

### Retention Strategy

Retention should come from compounding utility rather than lock-in alone:

*   **Daily habit**: Dashboard, job detail, schedule, and payment flows become the first thing opened each morning.
*   **Financial memory**: Invoice history, paid/unpaid state, payout tracking, and Xero sync make TradieMate the source of truth.
*   **Customer memory**: Customer profiles, reviews, job notes, photos, signatures, and repeat-job history create account value over time.
*   **Reputation memory**: Verified profile, licence badges, public reviews, and response history become portable proof of trust.
*   **Team memory**: Admin/member roles, assignments, job routing, and staff performance data make switching costly for businesses.
*   **Automation dependency**: Call-to-job, AI voice intake, reminders, and accounting sync save enough time that leaving feels like adding admin back.

### Migration Strategy From Other Platforms

TradieMate must reduce switching friction from the tools tradies already use:

| Current Tool | Migration Hook | Required Product Support |
| --- | --- | --- |
| Paper diary / whiteboard | "Take a photo or enter this week's jobs in 10 minutes." | Quick add job, bulk schedule import, OCR/photo-assisted job creation. |
| SMS + phone contacts | "Import customers and keep all job messages linked." | Contacts import, duplicate matching, SMS templates, customer timeline. |
| Square / Stripe reader | "Use the same card-payment habit without carrying hardware." | Tap to Pay, payment reconciliation, receipt SMS. |
| Xero / MYOB | "Keep accounting, remove double-entry." | Xero sync first, CSV export fallback, tax-safe invoice numbering. |
| ServiceM8 / Tradify | "Start with only active jobs, migrate history later." | CSV import, onboarding concierge, matching fields for clients/jobs/invoices. |
| Hipages / Airtasker | "Own repeat customers instead of renting leads." | Public profile, review capture, customer rebooking links, direct booking page. |

### Phase Exit Decision Rules

Do not move to the next phase just because the engineering tasks are complete. A phase exits only when business evidence exists:

*   **Activation**: New tradies can complete onboarding and create their first real job/invoice without human help.
*   **Value Realisation**: A tradie reaches a meaningful "aha" moment, such as collecting a payment, getting a review, or capturing a call lead.
*   **Repeat Use**: At least one workflow is used repeatedly by the same tradie across multiple jobs.
*   **Expansion Signal**: Users ask for team, accounting, scheduling, or automation because the core workflow is already working.
*   **Churn Learning**: Lost users are tagged by reason: too hard to onboard, no jobs entered, payments not trusted, already committed to another platform, price resistance, or missing integration.

---

## 🛠 Architectural Principles & Non-Negotiable Rules

Every developer on the project must adhere to these absolute architectural rules across all phases. Code reviews will reject any pull requests violating these:

1. **Integer Cents for Money**: Never use floating-point types (`float`, `double`, `numeric`) for currency. Store all monetary amounts as integer cents (e.g., AUD `$158.40` is stored as `15840`).
2. **Sydney Data Residency**: In compliance with the *Privacy Act 1988*, all databases, Supabase instances, S3 storage, and Firebase instances must reside in the Sydney region (`ap-southeast-2`).
3. **Strict ABN Verification**: Every registered tradie must have an Australian Business Number (ABN). The backend must validate the ABN against the Australian Taxation Office (ATO) API via a Luhn check and caching (24h). No job assignments can occur without verified ABN.
4. **No-Skip Invoice Numbers**: Invoices must sequence strictly (e.g., `INV-0001`, `INV-0002`). Use a `SELECT FOR UPDATE` transaction lock on the database to prevent racing conditions or missing numbers.
5. **No Inline Xero Sync**: Never block request-response cycles with Xero API calls. All Xero syncing operations must be queued asynchronously via **BullMQ** + **Redis**.
6. **Apple Sign In Compliance**: When implementing third-party SSO (Google, etc.), Apple Sign In is mandatory to comply with App Store Review Guideline 4.8. 
7. **MMKV Encrypted Storage**: Sensitive tokens, credentials, and offline keys on the mobile device must be stored using encrypted **MMKV** instances (`react-native-mmkv`). Never use `AsyncStorage` for sensitive data.
8. **Real-time Map Location Rate Limiting**: Limit live location updates from the mobile app to Firestore. Max 1 write to Firestore per GPS batch (up to 20 raw points) with client polling capped at 5000ms.
9. **TradieMate Design System v1.0 Compliance**: Every mobile and web UI must follow [TradieMate_Design_System.html](file:///Users/lenhutkhangvo/Developer/tradie-mate/TradieMate_Design_System.html). Use light mode only, warm background `#FAFAF8`, Forest Green CTA `#2E6B45`, Inter typography, minimum `44px` touch targets, `0.5px` borders, and MaterialCommunityIcons. Prefer icons from the approved icon library for all visual actions/statuses; do not use typed/text icons, emoji icons, unicode symbol icons, or ad-hoc drawn icons unless the design system explicitly lacks a suitable icon. Do not use drop shadows, gradients, heading weight `700`, pure-white base backgrounds, or borders thicker than `0.5px`.
10. **Entitlement-Gated Subscription Access**: Paid-feature access must be controlled by server-side entitlements, not mobile-only checks or hard-coded plan names. Every paid feature endpoint must call `requireActiveSubscription()` or `requireEntitlement(...)` unless explicitly marked as pre-paywall onboarding, public customer view, webhook, or admin/support route.
11. **Mapbox Location Foundation**: All routing, geocoding, customer tracking maps, supplies maps, and enterprise dispatch maps must use the shared Mapbox module defined in Phase 1. Do not create one-off map implementations in feature screens. Location permissions, token handling, route calculation, camera bounds, stale-location states, and cost/rate-limit controls must be implemented once and reused.
12. **Reusable Code First**: Before adding a feature-specific component, hook, schema, worker, API helper, adapter, or utility, developers must check the shared packages and extend an existing abstraction when the behaviour is cross-feature. Pull requests should be rejected when they duplicate existing primitives such as buttons, cards, status badges, map wrappers, entitlement checks, money helpers, invoice calculations, webhook idempotency, analytics events, or offline sync queues. Feature modules may own orchestration, but reusable behaviour belongs in shared packages.
13. **Test Coverage Per Module**: Every module must ship integration, contract, user-flow, and manual verification coverage for its critical path before it can be marked complete. Phase implementation plans do not require unit tests. At minimum, test service/domain behaviour through service or integration tests, API authorization and validation, database side effects, external adapter failure modes, reusable UI states, analytics events, entitlement gates, and offline/retry behaviour where relevant.

---

## 🎨 Design System Implementation Instruction

All UI instructions in every phase inherit these rules from `TradieMate_Design_System.html`. If an older module still mentions superseded styling such as Neo-Brutalism, orange CTAs, thick borders, hard shadows, gradients, emoji icons, or `48px` as the default minimum touch target, treat those as superseded by this section unless the design system is explicitly updated.

### Required Tokens

| Category | Token / Value | Usage |
| --- | --- | --- |
| Background | `#FAFAF8` / `--bg-base` | App and page base background. Never use pure white as the base. |
| Surface | `#EDECEA` / `--bg-surface` | Secondary surface, inactive states, subtle panels. |
| Elevated | `#FFFFFF` / `--bg-elevated` | Cards, forms, modals, list rows. |
| Border | `#E8E6E0` / `--border` | Default component border at `0.5px`. |
| Strong Border | `#D4D1CB` / `--border-strong` | Inputs and important separators at `0.5px`. |
| Primary Text | `#1A1A1A` / `--text-primary` | Main text and active icons. |
| Muted Text | `#888888` / `--text-muted` | Labels, metadata, inactive icons. |
| CTA | `#2E6B45` / `--cta` | Primary actions, active navigation, slide controls. |
| Success | `#639922` / `--success` | Verified, paid, completed, online. |
| Warning | `#BA7517` / `--warning` | Expiring, pending, attention. |
| Danger | `#E24B4A` / `--danger` | Failed, expired, destructive, cancellation. |
| Info | `#378ADD` / `--info` | Maps, calls, links, informational actions. |
| Rust | `#D85A30` / `--rust` | Legacy accent only; do not use as primary CTA. |
| Stone | `#5F5E5A` / `--stone` | Neutral statuses and disabled utility elements. |

### Required Component Rules

*   **Typography**: Use Inter. Display heading `28px/500`, section title `22px/500`, card title `18px/500`, list title `15px/500`, body `14px/400`, caption `12px/400`, section label `10px/500 uppercase`. Do not use font weight `700`.
*   **Spacing**: Use the 4px scale: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`.
*   **Radius**: Elements `8px`, cards `12px`, modals `16px`, badges/chips `20px`, avatars `9999px`.
*   **Touch**: All tappable elements must be at least `44px` high/wide. Critical CTAs may use `52px` or `56px`.
*   **Borders**: Use `0.5px` borders only. Do not use thicker borders.
*   **Shadows & Gradients**: Do not use drop shadows or gradients on UI components.
*   **Icons**: Use `@react-native-vector-icons/MaterialCommunityIcons` on mobile and the matching MCI visual set on web. Always pass explicit `size` and `color`. Use `16px` inline/badge icons, `20px` list/form icons, `24px` action/tab icons, and `32px` card/section icons. Prefer library icons over typed/text icons such as `+`, `!`, `✓`, arrows, stars, or emoji. Typed symbols may appear only as literal text content, never as the primary visual icon for an action, state, badge, tab, or navigation control.
*   **Buttons**: Primary button uses `--cta`, white text, `8px` radius, minimum `44px` height. Large buttons use `52px` height. Destructive buttons use `--danger`.
*   **Cards & Lists**: Cards use `--bg-elevated`, `0.5px --border`, `12px` radius, and no shadow. List rows use the same border/radius with hover/pressed state on `--bg-surface`.
*   **Badges**: Use pale semantic backgrounds and semantic text colors. Badges are `9-10px/500`, pill radius, and should include MCI icons when status clarity matters.
*   **Forms**: Inputs are `44px` high, `8px` radius, `0.5px --border-strong`, focus ring `0 0 0 3px --cta-pale`. Error state uses `--danger`; valid state uses `--success`.

---

## ♻️ Code Reusability Architecture

The implementation should behave like a product platform, not a collection of isolated feature screens. Each phase must add reusable building blocks that later modules consume without rewriting behaviour.

### Shared Package Boundaries

| Package / Layer | Owns | Must Not Own |
| --- | --- | --- |
| `packages/ui` | Design-system primitives, icons, buttons, cards, badges, forms, empty states, steppers, swipe confirmations, map panels, modal shells. | Feature-specific API calls or business rules. |
| `packages/mobile-core` | React Native hooks for auth session, network state, offline queue, haptics, permissions, notifications, secure storage, analytics. | Screen-specific rendering. |
| `packages/web-core` | Web layout primitives, customer-facing public page shells, form handling, responsive tracking/review/escrow UI primitives. | Mobile-only native behaviours. |
| `packages/domain` | Shared TypeScript types, Zod schemas, enums, money helpers, job status transitions, invoice totals, tax/GST helpers, entitlement names. | Database access or external SDK clients. |
| `apps/api/src/services` | Business services, transactional workflows, entitlement enforcement, invoice sequencing, subscription state, routing/geocoding, sync orchestration. | HTTP parsing or raw SDK calls inside route handlers. |
| `apps/api/src/adapters` | Stripe, Mapbox, Twilio, Xero, OCR, Vapi, registry, storage, and notification adapters behind interfaces. | Core business decisions. |
| `apps/api/src/queues` | BullMQ workers, retry policy, webhook replay, sync jobs, Xero sync, OCR processing, call-to-job processing. | User-facing request-response work that must complete immediately. |

### Reuse Rules For Implementation Plans

*   **UI screens** must compose `packages/ui` primitives first. Create module-local UI only when the component is truly unique and cannot be generalized after the second use.
*   **API routes** must stay thin: validate request, call service, return response. Shared business rules live in services and domain helpers.
*   **External integrations** must be adapter-based. Feature modules call interfaces such as `PaymentProvider`, `RoutingProvider`, `AccountingProvider`, `DocumentOcrProvider`, or `VoiceAgentProvider`, not raw SDKs.
*   **Money, tax, invoice totals, status transitions, entitlement checks, date/time formatting, and analytics event names** must be centralized in `packages/domain`.
*   **Offline-first behaviours** must use the same queue, conflict-resolution, retry, and sync-state primitives across jobs, invoices, signatures, documents, and payments.
*   **Map, payment, subscription, notification, review, document upload, and onboarding flows** must expose reusable hooks/components before being consumed by later modules.
*   **Tests** should cover shared primitives at the package/service level first, then add feature tests only for orchestration and edge cases.

### Required Reusable Foundations

| Foundation | First Built In | Reused By |
| --- | --- | --- |
| `AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell` | Phase 1.1 | All mobile/web UI modules. |
| `useAuthSession`, `useEntitlements`, `useNetworkState`, `useOfflineQueue`, `useAnalytics`, `useHaptics` | Phase 1 | All authenticated mobile workflows. |
| `Money`, `Tax`, `InvoiceTotals`, `InvoiceNumbering`, `PaymentStatus` helpers | Phase 1.2 | Earnings, Xero, escrow, marketplace, payouts. |
| `SubscriptionEntitlementService` and `requireEntitlement(...)` | Phase 1.5 | Team seats, Xero sync, AI voice, marketplace, enterprise. |
| `TradieMapView`, `MapboxLocationService`, `MapboxRoutingService` | Phase 1.6 | Live tracking, supplies finder, enterprise dispatch. |
| `DocumentUploadStepper`, `VerificationStatusBadge`, `OcrAdapter` | Phase 2.2 | Licence automation, enterprise compliance. |
| `PublicCustomerPageShell`, `TrustHeader`, `ReviewCaptureForm` | Phase 2.4 | Tracking, reviews, escrow, direct booking pages. |
| `AccountingSyncAdapter`, `QueuedIntegrationJob`, `IntegrationConnectionCard` | Phase 3.2 | Xero, MYOB/QuickBooks later, CSV fallback. |
| `TeamRolePolicy`, `OrganizationMemberService`, `SeatLimitGuard` | Phase 3.3 | Group plans, enterprise portal, dispatch. |
| `WebhookInbox`, `WebhookSignatureVerifier`, `IdempotencyGuard` | Phase 3.5 | Twilio, Stripe, Vapi, marketplace/escrow webhooks. |

---

## 🧪 Testing Architecture

Testing is part of implementation, not a separate hardening phase. Each module must include a short test matrix in the PR description covering the test types below.

### Required Test Layers

| Layer | Purpose | Examples |
| --- | --- | --- |
| Service/domain behaviour tests | Protect orchestration, transactions, and shared business rules without requiring phase-level unit tests. | Invoice creation rollback, money/GST behaviour through invoice services, subscription webhook reconciliation, document verification decisions, dispatch assignment rules. |
| API integration tests | Protect auth, validation, response contracts, and database writes. | `401/403/409` paths, Zod validation errors, idempotency, row ownership, standardized response envelopes. |
| Adapter contract tests | Protect external provider boundaries without relying on live services. | Stripe, Mapbox, Twilio, Xero, OCR, Vapi, registry adapters using mocked provider payloads. |
| Queue/worker tests | Protect retry, replay, and background processing. | BullMQ retry, dead-letter handling, webhook inbox replay, Xero sync, OCR processing, call-to-job extraction. |
| Mobile component tests | Protect reusable UI states and interactions. | Loading, empty, error, offline, permission denied, entitlement locked, pressed state, haptic trigger. |
| User-flow tests | Protect critical journeys. | Onboarding, create job, invoice, Tap to Pay, tracking link, review, Xero sync, team invite, dispatch, escrow release. |
| Manual device tests | Protect native and provider-specific behaviours. | Tap to Pay, push notification, background location, camera upload, app store SSO, physical-device GPS battery check. |

### Definition Of Done For Each Module

*   Critical path has at least one service/API integration test and one user-flow or component test.
*   Main failure path has explicit coverage: unauthorized access, invalid input, external provider failure, duplicate request, offline state, or entitlement denial.
*   Shared primitives introduced by the module have package-level or component tests before feature screens depend on them.
*   Test fixtures use stable IDs and mocked provider payloads; do not depend on live Stripe, Mapbox, Twilio, Xero, OCR, Vapi, or registry services in CI.
*   Tests assert business outcomes, not only HTTP status: database rows, queue jobs, analytics events, audit logs, entitlement usage counters, and user-visible state must be verified.

---

## 🏗️ SOLID & ACID API Architecture Framework

To ensure the Fastify backend is robust, maintainable, and financially secure, the codebase enforces strict compliance with **SOLID** design principles and database **ACID** transaction constraints.

### 📐 SOLID Principles Compliance

*   **Single Responsibility (SRP)**: Controllers parse/validate inputs, Services process business logic, and Adapters handle external APIs.
*   **Open/Closed (OCP)**: Integrations (OCR, Payments) depend on interfaces, enabling swappable backends without altering core service rules.
*   **Liskov Substitution (LSP)**: Mock services behaves identically to production modules in API response contracts and error classes.
*   **Interface Segregation (ISP)**: Classes depend on lean, narrow interfaces to prevent coupling.
*   **Dependency Inversion (DIP)**: Fastify uses dependency injection at startup, injecting abstract service instances into route controllers.

---

### 🛡️ ACID Transaction Guidelines (PostgreSQL & Drizzle ORM)

*   **Atomicity**: Multi-row writes (Invoices + Items + Sequences) run inside Drizzle `db.transaction()` blocks. Any throw rolls back all updates.
*   **Consistency**: Relational keys are maintained at DB level, with payloads validated via Zod schemas before running database statements.
*   **Isolation**: Uses Row-Level Locks (`SELECT ... FOR UPDATE`) to prevent sequence duplicate numbers under high concurrency.
*   **Durability**: Synchronous write commits confirm transaction status only when written to non-volatile WAL logs in Sydney disk storage.

---

## 🚨 Downtime & Data Loss Mitigation (Resiliency Spec)

To protect the business against data loss caused by server crashes, network outages, or API downtime, implement the following safety mechanisms across both frontend and backend layers:

### 1. The Offline-First Principle (Client-Side Protection)
*   **Local-First Commits**: Every record created on the mobile app (e.g., job updates, invoice lines, client signatures, parts consumed) must be written to **WatermelonDB (SQLite)** locally first. 
*   **Signature Persistence**: Never upload customer signatures directly to S3 inline. Store the signature data as a Base64 string in the local SQLite table. A background service uploads it to S3, updates the invoice with the resulting URL, and flags the item for sync.
*   **Retries on Timeout**: If the API is unreachable (request timeout, `502 Bad Gateway`, or `503 Service Unavailable`), the record status in SQLite remains marked as `UNSYNCED`. A sync worker retries the upload using an exponential backoff strategy when cellular connection returns.

### 2. Stripe Webhook & Payment Reconciliation
*   **Case**: A tradie processes a Stripe Tap-to-Pay transaction on-site. The payment completes successfully on Stripe's server, but the tradie's mobile connection drops before updating the API.
*   **Mitigation**:
    *   **Stripe Webhook Retries**: Rely on Stripe's webhook system. Stripe retries sending `payment_intent.succeeded` for up to 72 hours if the Fastify server is offline.
    *   **Idempotency Keys**: Use the invoice ID as the Stripe `idempotency_key` during PaymentIntent generation to avoid double charges.
    *   **Client Self-Healing**: On app start, the mobile app queries Stripe's SDK directly to check payment intent status. If the payment shows complete but the API is out of sync, the client sends a reconciliation payload to the backend.

### 3. Twilio Webhook Buffering (Call-to-Job Protection)
*   **Case**: A customer calls the tradie's automated line. The server crashes or the LLM API times out during the transcript processing, dropping the lead.
*   **Mitigation**:
    *   **Twilio Status Callback Retries**: Twilio is configured with fallback URLs and automatic webhook retries. If the primary API returns `5xx` or times out, Twilio falls back to a secondary server or queues the webhook retry.
    *   **Transactional Webhook Log**: The API must insert the raw Twilio webhook body into a `raw_webhooks` table first (status: `'PENDING'`) inside a database transaction before sending it to the LLM. If the server crashes mid-transcription, a BullMQ cron job processes any stale `'PENDING'` webhooks.

### 4. Database High Availability & Backups
*   **Multi-AZ Postgres**: The PostgreSQL database cluster in Sydney runs with an active-standby replica. Failover occurs automatically within 30 seconds if the primary node goes offline.
*   **Continuous Archiving (PITR)**: Enable Point-in-Time Recovery (PITR) with continuous Write-Ahead Log (WAL) archiving to S3, allowing the database to be restored to any millisecond within the last 7 days in case of corruption.

---

## 📂 Implementation Modules Index

The implementation is structured into 4 sequential phases:

Each phase file below is an execution index. Detailed instructions are split into numbered files inside the matching phase folder:

| Phase | Execution Folder |
| --- | --- |
| Phase 1 | [`phase_1_build_seed/`](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_1_build_seed/) |
| Phase 2 | [`phase_2_transition_grow/`](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_2_transition_grow/) |
| Phase 3 | [`phase_3_flip_accelerate/`](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_3_flip_accelerate/) |
| Phase 4 | [`phase_4_pure_product/`](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_4_pure_product/) |

Use `00_*` for phase context, execute module files in numeric order, use `90_*` for module test cases, and use `99_*` for final phase verification.

### [Phase 1: Build & Seed (M1–M8)](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_1_build_seed.md)
*Focus: Core MVP, OTP Authentication, Invoicing, Stripe Tap to Pay, Offline Sync Indicators, local SQLite caching, flexible tradie subscription/entitlement billing, and shared Mapbox routing/geocoding infrastructure.*
*Business validation: prove a solo tradie can enter jobs, invoice, collect payment, and keep working offline without admin help.*

### [Phase 2: Transition & Grow (M9–M18)](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_2_transition_grow.md)
*Focus: Live GPS Tracking (Uber-style), Stepper-based Trade Licence & Public Liability Document Verification with AWS Textract/Google Document AI, Google + Apple SSO, Public Profiles, and Customer Reviews.*
*Business validation: prove customer trust features increase professionalism, reduce "where are you?" calls, and improve review/rebooking rates.*

### [Phase 3: Flip & Accelerate (M19–M30)](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_3_flip_accelerate.md)
*Focus: Detailed Earnings Dashboard (Forest Green/Rust theme), full Xero Integration, Group Plans (Multi-tradie admin boundary), Drag-and-Drop Scheduling, Call-to-Job automation (Twilio Whisper + Claude API), and Nearby Supplies Finder.*
*Business validation: prove TradieMate becomes a revenue/control system, not only a job notebook, by driving paid retention and team expansion.*

### [Phase 4: Pure Product (M31+)](file:///Users/lenhutkhangvo/Developer/tradie-mate/docs/implementation_breakdown/phase_4_pure_product.md)
*Focus: Automated state registries checks (NSW Fair Trading, QBCC, etc.), Enterprise/Property Management portals, Vapi.ai Voice Agent integration, and the Scheduling Marketplace with escrow payments.*
*Business validation: prove the platform can generate and route demand while maintaining trust, compliance, and payment protection.*

---

## ⚙️ Shared Core Stack

*   **API (Backend)**: Fastify v5, Drizzle ORM, PostgreSQL, Redis + BullMQ, Twilio SDK, Stripe API, Firebase Admin SDK, Sentry Node, PDFKit.
*   **Mobile (Tradie App)**: React Native (v0.85.3 CLI) — strictly for the tradie, containing offline SQLite databases (WatermelonDB), secure key management (MMKV), Stripe card reader, and Mapbox routing.
*   **Web (Customer & Enterprise Views)**: Responsive mobile-web pages and web portals (no customer native app). Used for customer geolocation tracking, review submission, payment escrow releases, and the property manager dispatch panel.

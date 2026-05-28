# Phase 1 — Build & Seed (M1–M8)
**Goal**: Launch MVP, onboard first 50 Brisbane beta tradies, reach $2K MRR.

---

## Business Hypothesis & Phase Exit Criteria

**Hypothesis**: A solo tradie will pay for TradieMate if it helps them complete the daily loop of job tracking -> invoice -> payment -> receipt faster than their current mix of phone notes, paper diary, Square/Stripe reader, and Xero/MYOB.

**Primary intention served**: "I want to get through today's jobs and get paid without doing admin tonight."

**Target users for validation**:
*   Solo plumbers, electricians, cleaners, handymen, and HVAC technicians in Brisbane who already take jobs by phone/SMS.
*   Tradies currently using paper diary + Xero, Square, or manual invoice templates.
*   Exclude multi-staff businesses until Phase 3 unless they are willing to use solo mode first.

**Phase exit metrics**:
*   50 beta tradies onboarded, with at least 30 completing ABN verification.
*   60% of activated tradies create at least 3 jobs within 14 days.
*   40% of activated tradies create at least 1 real invoice.
*   25% of activated tradies collect or mark a payment in-app.
*   Median time from job complete to invoice sent is under 3 minutes.
*   Subscription foundation is live with trial, active, past-due, cancellation, entitlement, and usage-limit states verified through Stripe test webhooks.
*   At least 10 tradies report that the app replaced an existing admin step.

**Retention levers introduced in this phase**:
*   Job history becomes the tradie's working diary.
*   Invoice numbers and receipts become financial memory.
*   Offline drafts protect work done in poor reception areas.
*   Payment status gives a reason to reopen the app after a job.

**Migration wedge**:
*   Do not ask users to migrate all history on day one. Ask them to enter only "today and tomorrow's jobs", then create one real invoice.
*   Offer CSV import later, but MVP migration should be manual and fast: add client, job, price, invoice, payment.

**Reusable code deliverables for Phase 1**:
*   Create `packages/ui` primitives before building feature screens: `AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, and `OfflineSyncBadge`.
*   Create `packages/domain` helpers for `Money`, GST/tax calculation, invoice totals, invoice status, job status transitions, entitlement names, and analytics event names.
*   Create shared mobile hooks in `packages/mobile-core`: `useAuthSession`, `useNetworkState`, `useOfflineQueue`, `useAnalytics`, `useHaptics`, `useNotificationPermission`, `useLocationPermission`, and `useEntitlements`.
*   Create Fastify service boundaries for `JobService`, `InvoiceService`, `PaymentService`, `AuthService`, `SubscriptionEntitlementService`, `NotificationService`, and `MapboxLocationService`; routes must call services rather than duplicating business logic.
*   Create adapter interfaces for Stripe, Twilio Verify, Mapbox, storage, and push notifications so later phases can swap providers or mock integrations in tests.
*   Create one offline sync queue contract for jobs, invoices, signatures, documents, payments, and location events.

---

---

> Execution order: `00`  
> Next: [📌 Module 1.1: Dashboard & Job Detail (Core Navigation)](./01_module_1_1_dashboard_job_detail_core_navigation.md)

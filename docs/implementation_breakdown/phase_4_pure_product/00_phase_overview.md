# Phase 4 — Pure Product (M31+)
**Goal**: Scale to 5,000 paying tradies, hit $2.3M ARR, close the outsourcing arm, and deploy automated verification, enterprise dispatching, and AI voice agents.

---

## Business Hypothesis & Phase Exit Criteria

**Hypothesis**: TradieMate can move from SaaS utility to demand and trust infrastructure when it has enough verified tradie supply, job history, customer trust, and operational reliability.

**Primary intention served**: "Bring me better work and protect the transaction."

**Phase exit metrics**:
*   5,000 paying tradies.
*   Enterprise dispatch clients create repeat monthly job volume.
*   Marketplace bookings have completion rate above 85%.
*   Escrow dispute rate remains below 5% and median resolution time stays under 5 business days.
*   AI voice jobs convert to accepted jobs at a higher rate than voicemail-only baseline.
*   Automated licence checks reduce expired-document manual handling without increasing false blocks.

**Retention levers introduced in this phase**:
*   Enterprise/marketplace demand gives tradies revenue reasons to stay.
*   Automated compliance and escrow protect customer trust at platform scale.
*   AI voice agent becomes a revenue capture layer for busy businesses.

**Migration wedge**:
*   For marketplace-dependent tradies, pitch lower dependency on rented leads through owned profile + direct booking + platform jobs.
*   For property managers, pitch verified local supply, ETA transparency, payment control, and dispute evidence.
*   For established trade businesses, pitch AI voice and dispatch as a cheaper alternative to missed calls or admin hires.

**Scope warning**:
*   Phase 4 should not start until Phase 1-3 retention is proven. Marketplace without retained supply becomes a demand-generation cost centre, not a product moat.

**Reusable code deliverables for Phase 4**:
*   Extend Phase 2 verification services into registry adapters using a common `LicenceRegistryAdapter`, `ComplianceDecisionService`, `ManualOverridePanel`, and `ComplianceAuditTrail`.
*   Extend Phase 3 organization, scheduling, and Mapbox foundations into enterprise dispatch primitives: `DispatchMap`, `AssignableTradieList`, `PropertyJobQueue`, `RouteCostPreview`, and `DispatchAuditLog`.
*   Create reusable voice automation primitives: `VoiceAgentAdapter`, `CallScriptEditor`, `BusinessHoursEditor`, `CallOutcomeReviewCard`, and `LeadAcceptanceFlow`.
*   Extend Phase 1/3 payment foundations into marketplace primitives: `EscrowService`, `DisputeEvidenceUploader`, `ReleasePaymentButton`, `EscrowStatusBadge`, and `MarketplaceCommissionCalculator`.
*   Reuse `WebhookInbox`, `WebhookSignatureVerifier`, and `IdempotencyGuard` for Vapi, escrow, marketplace, and enterprise partner webhooks.
*   Keep marketplace, enterprise, compliance, and voice-agent modules as orchestration layers over shared domain services rather than parallel implementations.

---

---

> Execution order: `00`  
> Next: [📌 Module 4.1: Multi-State Licence Verification Automation](./01_module_4_1_multi_state_licence_verification_automation.md)

# Phase 3 — Flip & Accelerate (M19–M30)
**Goal**: Reach $20K+ sustained MRR, trigger the wind-down of the outsourcing business, introduce team plans, accounting integrations, and AI automation.

---

## Business Hypothesis & Phase Exit Criteria

**Hypothesis**: Once solo workflows prove useful, tradies will expand usage when TradieMate controls money visibility, accounting sync, scheduling, staff assignment, and missed-call capture.

**Primary intention served**: "Help me run the business, not just today's job."

**Phase exit metrics**:
*   $20K+ sustained MRR.
*   Net revenue retention above 100% from team seats, accounting, and automation add-ons.
*   30% of paying tradies connect Xero or export accounting data monthly.
*   20% of paying accounts use scheduling weekly.
*   10% of paying accounts add at least one team member.
*   Call-to-job creates qualified job drafts with a tradie acceptance rate above 35%.

**Retention levers introduced in this phase**:
*   Xero sync and earnings data make TradieMate part of the financial workflow.
*   Team plans create account expansion and admin dependency.
*   Call-to-job protects revenue leakage from missed calls.
*   Scheduling makes the app the operational calendar.

**Migration wedge**:
*   For ServiceM8/Tradify users, offer migration of active clients/jobs/invoices plus Xero connection.
*   For solo users, introduce team mode only when they invite a subcontractor or employee.
*   For phone-heavy businesses, position Call-to-Job as "stop losing leads while on the tools."

**Reusable code deliverables for Phase 3**:
*   Extend `packages/domain` money helpers into reusable earnings, payout, fee, GST, and reconciliation calculators used by dashboards, Xero, escrow, and marketplace modules.
*   Create reusable chart and financial UI primitives: `PeriodSegmentedControl`, `MetricTile`, `EarningsChart`, `PayoutBreakdownModal`, and `ReconciliationStatusBadge`.
*   Create integration foundations: `AccountingSyncAdapter`, `IntegrationConnectionCard`, `QueuedIntegrationJob`, `IntegrationHealthBadge`, and `OAuthConnectionService`.
*   Create organization foundations: `TeamRolePolicy`, `OrganizationMemberService`, `SeatLimitGuard`, `MemberInviteForm`, and `RoleBadge`.
*   Create scheduling primitives: `CalendarGrid`, `JobScheduleCard`, `DragScheduleOverlay`, `RescheduleConfirmModal`, and `AvailabilityRuleEditor`.
*   Create webhook foundations: `WebhookInbox`, `WebhookSignatureVerifier`, `IdempotencyGuard`, `RawWebhookReplayWorker`, and shared event audit schemas for Twilio, Stripe, Xero, and future Vapi webhooks.
*   Reuse Phase 1 Mapbox and Phase 2 public customer primitives for supplies finder, team dispatch, and customer-facing communication instead of adding separate map or link implementations.

---

---

> Execution order: `00`  
> Next: [📌 Module 3.1: Earnings Dashboard (V2)](./01_module_3_1_earnings_dashboard_v2.md)

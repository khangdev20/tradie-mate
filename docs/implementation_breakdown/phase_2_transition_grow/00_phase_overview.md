# Phase 2 — Transition & Grow (M9–M18)
**Goal**: Reach 350 paying tradies, hit $13,650 MRR, implement legal verification, and build the Uber-style live tracking feature.

---

## Business Hypothesis & Phase Exit Criteria

**Hypothesis**: Tradies will keep paying when TradieMate makes them look more professional to customers and turns completed jobs into public proof, reviews, and repeat bookings.

**Primary intention served**: "Help my customers trust me, stop chasing me, and book me again."

**Phase exit metrics**:
*   350 paying tradies.
*   70% of active tradies complete document verification.
*   50% of commute jobs send a tracking link.
*   Customer tracking page open rate above 45% for sent links.
*   Review request conversion above 20% for paid/completed jobs.
*   At least 15% of tradies receive one customer review through TradieMate.

**Retention levers introduced in this phase**:
*   Verified profile and review history create reputation value.
*   Tracking links reduce customer calls and improve perceived professionalism.
*   Public profile starts moving the app from internal tool to customer-facing business asset.

**Migration wedge**:
*   For users on marketplaces like Hipages/Airtasker, emphasize owning customer reputation and repeat bookings.
*   For users on ServiceM8/Tradify, emphasize lightweight customer-facing tracking/reviews without forcing a full operations migration.

**Reusable code deliverables for Phase 2**:
*   Extend the Phase 1 `TradieMapView`, `MapboxRoutingService`, and permission hooks for live tracking instead of building tracking-specific map code.
*   Create reusable customer-facing web primitives: `PublicCustomerPageShell`, `TrustHeader`, `TradieIdentityCard`, `CallTradieButton`, `CancelBookingDialog`, and `ShareLinkBanner`.
*   Create reusable verification primitives: `DocumentUploadStepper`, `DocumentCaptureFrame`, `VerificationStatusBadge`, `VerificationChecklist`, and `OcrReviewPanel`.
*   Create `DocumentVerificationService` and `OcrAdapter` interfaces so AWS Textract, Google Document AI, or manual review can be swapped without changing upload screens.
*   Create reusable review/profile primitives: `ReviewCaptureForm`, `RatingInput`, `PublicProfileCard`, `ReviewSummary`, and `RebookingCTA`.
*   Reuse shared analytics, entitlement, notification, and offline sync hooks for every verification, tracking, profile, and review workflow.

---

---

> Execution order: `00`  
> Next: [📌 Module 2.1: Customer Live Geolocation Tracking](./01_module_2_1_customer_live_geolocation_tracking.md)

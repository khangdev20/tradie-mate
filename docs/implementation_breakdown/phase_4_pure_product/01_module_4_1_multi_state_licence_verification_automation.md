> Execution order: `01`  
> Parent phase: [Phase 4 — Pure Product (M31+)](../phase_4_pure_product.md)  
> Previous: [Phase Overview](./00_phase_overview.md)

## 📌 Module 4.1: Multi-State Licence Verification Automation
**Timeline**: Months 31–36
**Focus**: Automatic validation against official state licensing databases.

### Business Value & Adoption Evaluation

**User intention**: "Keep me eligible for work without surprise compliance problems."

**Why users will use it**:
*   Enterprise clients and property managers require verified, current credentials.
*   Tradies benefit from renewal reminders before expired documents block revenue.

**Adoption risk**:
*   False positives can block legitimate tradies and create urgent support burden.
*   State registry scraping may be brittle and legally sensitive.

**Retention mechanism**:
*   Compliance history and automated reminders turn TradieMate into a work-eligibility system.

**Migration support**:
*   Offer verified status as a prerequisite for higher-value enterprise/marketplace work.

**Success metrics**:
*   Automated check success rate by state.
*   False block rate.
*   Renewal action rate after reminder.
*   Number of enterprise jobs blocked/prevented due to expired documents.

**Build detail additions**:
*   Add registry adapter interfaces per state with clear failure modes.
*   Add manual override workflow with audit trail.
*   Store registry response snapshots and timestamps for compliance evidence.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### ⚠️ Licence Status Urgency Banner
*   **Urgency Notification Overlay**:
    *   If the automated cron job detects a license issue (suspension, expiry, cancelation), block job assignments and show a persistent overlay banner on the home dashboard.
    *   **Layout**: `0.5px` border outline in Danger Red (`#E24B4A`) with `#FCEBEB` (`--danger-pale`) background and no shadow. It displays an error message: *"Licence status check failed. Access blocked. Tap to update details."*
    *   Disable all other dashboard tabs and buttons until the user acknowledges the alert or re-submits their credentials.

---

### 🔌 API & Database Specification

#### 🗄️ Background Worker Registry Scraper (`src/queues/licence-worker.ts`)
*   **Trigger**: Weekly BullMQ Cron check.
*   **Scraper Logic**:
    *   Queries `tradie_documents` where status is `'VERIFIED'` and type is `'LICENCE'`.
    *   Queries state registers:
        *   **NSW**: Hitting Fair Trading Public Register endpoints.
        *   **QLD**: Scraping QBCC License Search tables.
        *   **VIC**: VBA registry lookup checks.
    *   If a license returns status *Cancelled*, *Expired*, or *Suspended*:
        *   Update `tradie_documents.status` to `'EXPIRED'`.
        *   Trigger FCM Push notification warning the user and block routing updates.
*   **Workflow Evaluation**:
    *   **Pre-conditions**: A `tradie_documents` record exists with status `'VERIFIED'`, type `'LICENCE'`, and license details mapped to a mock suspended license ID in NSW registry.
    *   **Test Execution**:
        Trigger the BullMQ worker manually via a test script or Bull-Board UI:
        ```typescript
        import { LicenceWorker } from './src/queues/licence-worker';
        await LicenceWorker.processJob({ data: { checkAll: true } });
        ```
    *   **Expected Assertions**:
        *   **Database Validation**: The target `tradie_documents.status` is updated to `'EXPIRED'`.
        *   **Side Effects**: Verifies that a push notification is dispatched using Notifee/FCM.

---

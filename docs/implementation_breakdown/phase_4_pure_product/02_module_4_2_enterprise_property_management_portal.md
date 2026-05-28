> Execution order: `02`  
> Parent phase: [Phase 4 — Pure Product (M31+)](../phase_4_pure_product.md)  
> Previous: [📌 Module 4.1: Multi-State Licence Verification Automation](./01_module_4_1_multi_state_licence_verification_automation.md)

## 📌 Module 4.2: Enterprise & Property Management Portal
**Timeline**: Months 33–38
**Focus**: B2B job dispatch portal for property agencies and strata managers.

### Business Value & Adoption Evaluation

**User intention**: "Send property maintenance work to verified tradies quickly, with evidence and payment control."

**Why users will use it**:
*   Property managers need reliable dispatch, tenant communication, proof of completion, and fewer phone calls.
*   Tradies gain higher-value recurring work, which increases platform retention.

**Adoption risk**:
*   Enterprise onboarding and support load can distract from core tradie SaaS.
*   Without enough verified local supply, dispatch quality will be poor.

**Retention mechanism**:
*   Enterprise job flow gives tradies revenue dependency, not just software dependency.
*   Property managers build operational workflows and supplier history inside the portal.

**Migration support**:
*   Start with CSV/API import from property management systems rather than full integration.
*   Provide a concierge pilot for 2-3 property agencies before self-serve.

**Success metrics**:
*   Dispatch-to-acceptance rate.
*   Time to assign.
*   Job completion rate.
*   Enterprise repeat job volume.
*   Tradie revenue from enterprise jobs.

**Build detail additions**:
*   Add enterprise roles, approval limits, tenant contact preferences, and job priority.
*   Add dispatch audit log visible to enterprise admins.
*   Add SLA tracking for accept time, arrival, completion, and dispute.
*   Reuse Module 1.6 Mapbox route, camera bounds, pin styling, geocoding cache, and route-cache services for property dispatch.

### 🖥️ Web Portal UX & UI Specifications (React/Web)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 📋 Dispatch Board & Routing Interface
*   **Layout Design**:
    *   Two-column split view conforming to TradieMate Design System v1.0 styling.
    *   *Left Column*: Listing of pending property maintenance tasks.
    *   *Right Column*: Map displaying verified local tradies as active custom pins.
*   **Drag-to-Assign Interaction**:
    *   Strata managers drag a job card from the left panel and drop it directly onto a tradie pin on the map.
    *   *Visual States*: Highlighting target pins and drawing route paths to properties.
    *   Route paths, ETA, and distance must come from Module 1.6 `MapboxRoutingService`; do not call Mapbox directly from the portal UI.
    *   *Rescheduling Confirmation*: Once dropped, trigger a card overlay showing estimated travel distance, travel time, and service cost before confirming.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const enterpriseClients = pgTable('enterprise_clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  abn: varchar('abn', { length: 15 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dispatchJobs = pgTable('dispatch_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  enterpriseClientId: uuid('enterprise_client_id').notNull(),
  propertyAddress: text('property_address').notNull(),
  tenantName: varchar('tenant_name', { length: 255 }).notNull(),
  tenantPhone: varchar('tenant_phone', { length: 20 }).notNull(),
  assignedTradieId: uuid('assigned_tradie_id'),
  status: varchar('status', { length: 50 }).default('UNASSIGNED').notNull(), // 'UNASSIGNED' | 'DISPATCHED' | 'ACCEPTED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/enterprise/jobs/dispatch`
*   **Auth**: Bearer API Token (Enterprise Client credentials verified).
*   **Request Body**:
    ```json
    {
      "propertyAddress": "12 High St, Brisbane QLD 4000",
      "tenantName": "Sarah Tenant",
      "tenantPhone": "+61499999999",
      "description": "Hot water system completely leaking.",
      "tradeType": "Plumbing"
    }
    ```
*   **Business Logic**:
    *   Verify the enterprise account.
    *   Query the database to search for nearest verified, available tradies with matching `tradeType` and within a 25km radius.
    *   Insert row into `dispatch_jobs` set status to `'DISPATCHED'`.
    *   Trigger an FCM Push alert to the matched tradie.
*   **Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "data": {
        "dispatchJobId": "c3b8a64d-3b7c-4a9b-90f7-1cb7b77a0155",
        "status": "DISPATCHED",
        "matchedTradiesCount": 3
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Valid B2B API Token stored in `$API_TOKEN`. Active verified tradies are online within 25km of the property address.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Authorization: Bearer $API_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"propertyAddress": "12 High St, Brisbane QLD 4000", "tenantName": "Sarah Tenant", "tenantPhone": "+61499999999", "description": "Hot water system completely leaking.", "tradeType": "Plumbing"}' \
          "http://localhost:3000/api/v1/enterprise/jobs/dispatch"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `201 Created`
        *   **Response**: Standardized envelope with `success: true` and dispatch details inside `data`.
        *   **Database Validation**: Row added to `dispatch_jobs` in `'DISPATCHED'` state.
        *   **Side Effects**: Triggers an FCM push alert to each of the matched local tradies.

---

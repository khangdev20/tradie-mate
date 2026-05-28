> Execution order: `02`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [📌 Module 3.1: Earnings Dashboard (V2)](./01_module_3_1_earnings_dashboard_v2.md)

## 📌 Module 3.2: Xero Integration (Accounting Sync)
**Timeline**: Months 19–22
**Focus**: Automatic syncing of invoices and payment receipts.

### Business Value & Adoption Evaluation

**User intention**: "Stop double-entering invoices and payments into accounting."

**Why users will use it**:
*   Accounting sync is a direct migration bridge for tradies already using Xero.
*   It upgrades TradieMate from job tool to financial operations system.

**Adoption risk**:
*   Sync failures can create accounting anxiety.
*   Wrong tax/contact mapping can be costly and hard to unwind.

**Retention mechanism**:
*   Once Xero sync works, removing TradieMate means reintroducing manual bookkeeping.

**Migration support**:
*   Build CSV fallback for MYOB/QuickBooks/accountants before broader integrations.
*   Offer one-time import of contacts/items from Xero where permitted.

**Success metrics**:
*   Xero connection rate among paying users.
*   Invoice sync success rate.
*   Median sync latency.
*   Failed sync retry success rate.
*   Number of manual support interventions.

**Build detail additions**:
*   Add `xero_sync_jobs` table with status, retry count, last error, and external IDs.
*   Map contacts, invoice line items, GST, payments, and credit notes explicitly.
*   Add user-visible sync log per invoice.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 🔌 Connection Webview UX
*   **Auth OAuth Portal**:
    *   Launches an in-app browser using `react-native-inappbrowser-reborn` (preserving app layout boundaries).
    *   **Sync Load Screen**: While linking, display a loading screen showing a documents icon moving through a syncing gears animation. Show clear progress labels: *"Authenticating with Xero..."* -> *"Syncing contact fields..."*.
*   **Sync Status Badges**:
    *   Next to every invoice, show a distinct status indicator:
        *   **Synced**: MCI `check-circle` or status dot in Success Green (`#639922`) indicating a successful sync.
        *   **Pending**: MCI `clock-outline` or status dot in Warning (`#BA7517`) indicating queued status.
        *   **Failed**: MCI `close-circle` or status dot in Danger Red (`#E24B4A`) with a prominent, touchable `Retry Sync` action icon (minimum `44px` target) beside it.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const xeroConnections = pgTable('xero_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradieId: uuid('tradie_id').notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull(),
  accessToken: text('access_token').notNull(), // Encrypted column
  refreshToken: text('refresh_token').notNull(), // Encrypted column
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `GET /api/v1/integrations/xero/connect`
*   **Auth**: Bearer JWT.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "authUrl": "https://login.xero.com/identity/connect/authorize?response_type=code&client_id=..."
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/integrations/xero/connect"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and auth URL inside `data`.

##### 2. `GET /api/v1/integrations/xero/callback`
*   **Query Parameters**:
    ```json
    {
      "code": "string",
      "state": "string"
    }
    ```
*   **Business Logic**:
    *   Request token from Xero token endpoint exchanging `code`.
    *   Encrypt `access_token` and `refresh_token` before saving to `xero_connections`.
*   **Response (`200 OK`)**: Renders inline HTML confirming sync completion.
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Valid auth `code` and `state` parameters returned from Xero authorization code flow.
    *   **Test Request**:
        ```bash
        curl "http://localhost:3000/api/v1/integrations/xero/callback?code=mock_code&state=mock_state"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: HTML webpage template stating authorization is successful.
        *   **Database Validation**: Encrypted `access_token` and `refresh_token` are successfully saved to `xero_connections` table.

---

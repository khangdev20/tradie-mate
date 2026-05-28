> Execution order: `04`  
> Parent phase: [Phase 1 — Build & Seed (M1–M8)](../phase_1_build_seed.md)  
> Previous: [📌 Module 1.3: Phone OTP Auth & ABN Validation](./03_module_1_3_phone_otp_auth_abn_validation.md)

## 📌 Module 1.4: Push Notifications & Offline Mode
**Timeline**: Month 2
**Focus**: Ensure reliability when tradies are underground or in areas with poor cellular coverage.

### Business Value & Adoption Evaluation

**User intention**: "Do not lose my work just because the signal is bad."

**Why users will use it**:
*   Reliability is a trust requirement in field work. If one invoice or signature disappears, users may churn immediately.
*   Push notifications create the habit loop for accepted jobs, payment updates, and later call-to-job automation.

**Adoption risk**:
*   Offline sync bugs create severe trust damage.
*   Too many notifications can feel noisy and reduce app permissions acceptance.

**Retention mechanism**:
*   Users keep working in the app even in poor reception areas, which strengthens daily reliance.
*   Sync indicators reassure users that TradieMate is safe enough for real work.

**Migration support**:
*   Promote "works when your current web tools do not" as a practical reason to switch from browser-only products.

**Success metrics**:
*   Push permission opt-in rate.
*   Offline queue success rate.
*   Sync conflict rate.
*   Number of records recovered after offline sessions.
*   Support tickets related to missing data.

**Build detail additions**:
*   Add local operation IDs and server idempotency keys to every offline mutation.
*   Add a Sync Health screen showing queued, failed, and completed sync items.
*   Add notification preference categories: jobs, payments, reminders, compliance, marketing.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 📡 Network Sync Banner & Indicators
*   **Status Indicator Dot**:
    *   Position a clean status indicator in the top navbar:
        *   **Online**: MCI `wifi` icon with Success Green (`#639922`) indicating a stable internet connection.
        *   **Offline**: MCI `wifi-off` icon with Warning (`#BA7517`). Displays a banner: *"Working Offline — Changes will sync when signal returns"*.
        *   **Syncing**: MCI `sync` icon with Info Blue (`#378ADD`) and an infinite opacity loop (`0.4` to `1` over `1500ms`) showing active sync progress.
*   **Visual Cue for Unsynced Items**:
    *   Any job update or invoice draft created offline displays a small MCI `alert-circle` icon in Warning (`#BA7517`) next to it in lists. Once successfully synced, animate to MCI `check-circle` in Success Green (`#639922`) and fade it out over `1000ms`.

#### 🔔 Push Notifications
*   **Custom Banners**:
    *   Show push alerts using native Notifee custom components. 
    *   Include immediate interactive action buttons inside the banner: `View Details` and `Accept Job` (triggers a direct, background status update).

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const fcmTokens = pgTable('fcm_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradieId: uuid('tradie_id').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/devices/fcm-token`
*   **Auth**: Bearer JWT.
*   **Request Body**:
    ```json
    {
      "token": "fcm_token_123456789_abcdefg"
    }
    ```
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "message": "FCM token saved successfully."
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"token": "fcm_token_123456789_abcdefg"}' \
          "http://localhost:3000/api/v1/devices/fcm-token"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and success message inside `data`.
        *   **Database Validation**: Table `fcm_tokens` has 1 new row linking auth `tradieId` with the token.

##### 2. `POST /api/v1/sync`
*   **Auth**: Bearer JWT.
*   **Request Body**:
    ```json
    {
      "queue": [
        {
          "action": "UPDATE_STATUS",
          "payload": {
            "jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345",
            "status": "COMMUTING",
            "timestamp": "2026-05-25T22:10:00Z"
          }
        },
        {
          "action": "CREATE_INVOICE",
          "payload": {
            "invoiceId": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0641",
            "jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345",
            "items": [
              {
                "description": "Labour standard fee",
                "quantity": 1,
                "unitPrice": 12000
              }
            ],
            "timestamp": "2026-05-25T22:12:00Z"
          }
        }
      ]
    }
    ```
*   **Business Logic (Conflict Resolution Checks)**:
    *   API processes the synced actions inside a Single PostgreSQL transaction block.
    *   For status updates, check the database `updatedAt` for the job. If the server timestamp is newer than the client offline payload's `timestamp`, discard the sync update to prevent overriding modifications (Server-Wins conflict resolution).
    *   For invoice creations, verify if the transaction ID or invoice ID is already saved. If yes, skip to prevent duplicates.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "syncedCount": 2,
        "results": [
          { "action": "UPDATE_STATUS", "status": "SUCCESS" },
          { "action": "CREATE_INVOICE", "status": "SUCCESS" }
        ]
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"queue": [{"action": "UPDATE_STATUS", "payload": {"jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345", "status": "COMMUTING", "timestamp": "2026-05-25T22:10:00Z"}}, {"action": "CREATE_INVOICE", "payload": {"invoiceId": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0641", "jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345", "items": [{"description": "Labour standard fee", "quantity": 1, "unitPrice": 12000}], "timestamp": "2026-05-25T22:12:00Z"}}]}' \
          "http://localhost:3000/api/v1/sync"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and sync count and details inside `data`.
        *   **Database Validation**:
            *   Updates `jobs.status` to `COMMUTING` unless server-side `updatedAt` is more recent.
            *   Inserts unique invoice and invoice items under database transaction constraints.

---

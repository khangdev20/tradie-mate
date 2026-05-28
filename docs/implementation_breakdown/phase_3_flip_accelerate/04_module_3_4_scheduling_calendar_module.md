> Execution order: `04`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [📌 Module 3.3: Group Plan & Multi-Tradie Admin View](./03_module_3_3_group_plan_multi_tradie_admin_view.md)

## 📌 Module 3.4: Scheduling & Calendar Module
**Timeline**: Months 22–24
**Focus**: Visual week calendar interface with drag-and-drop rescheduling features.

### Business Value & Adoption Evaluation

**User intention**: "Help me avoid double-booking and move jobs around quickly."

**Why users will use it**:
*   Scheduling is a high-frequency operational workflow.
*   Conflict detection saves embarrassment and customer churn.

**Adoption risk**:
*   Drag-and-drop may be less useful on small phones than quick reschedule actions.
*   If calendar does not match external calendars, users may not trust it.

**Retention mechanism**:
*   The schedule becomes the operational source of truth and increases daily opens.

**Migration support**:
*   Import from Google/Apple calendar or CSV in later iterations.
*   Provide SMS notifications to customers when jobs move.

**Success metrics**:
*   Weekly calendar active users.
*   Reschedule success rate.
*   Conflict prevention count.
*   Customer notification delivery rate.
*   No-show or late-arrival reduction.

**Build detail additions**:
*   Add schedule audit trail with old/new times and notification status.
*   Add time-zone safe all-day/date handling for Australia.
*   Add external calendar integration backlog item with read-only first.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 📅 Drag-and-Drop Calendar UX
*   **Weekly Grid Layout**:
    *   Format days as vertical columns. Active jobs appear as block cards with `0.5px` borders.
*   **Drag Interaction**:
    *   Pressing and holding a job block for `500ms` triggers a haptic pulse (`impactMedium`) to signal it's ready to drag.
    *   Lift the card visually without shadow: increase its scale (`scale: 1.05`), reduce its opacity to `0.85`, and use `#EAF3DE` (`--cta-pale`) as the active slot backdrop.
    *   As the user drags the card, highlight valid scheduling target slots on the grid with a dashed Forest Green CTA border (`#2E6B45`).
    *   *Rescheduling Confirmation*: Dropping the card in a new slot triggers a modal: *"Reschedule John's service to Thursday 2:00 PM? This sends an automatic SMS notification to the customer."*

---

### 🔌 API & Database Specification

#### 🛣️ Endpoints Details

##### 1. `PATCH /api/v1/jobs/:id/reschedule`
*   **Auth**: Bearer JWT.
*   **Request Body**:
    ```json
    {
      "scheduledStart": "2026-05-28T14:00:00+10:00",
      "scheduledEnd": "2026-05-28T16:00:00+10:00"
    }
    ```
*   **Business Logic**:
    *   Verify job ownership.
    *   Execute conflict detection query: Check for overlap with existing jobs for the same tradie:
        ```sql
        SELECT id FROM jobs 
        WHERE tradie_id = :tradieId 
          AND status != 'CANCELLED'
          AND scheduled_start < :scheduledEnd
          AND scheduled_end > :scheduledStart;
        ```
    *   If overlap exists, return `409 Conflict`.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "scheduledStart": "2026-05-28T14:00:00+10:00",
        "scheduledEnd": "2026-05-28T16:00:00+10:00"
      }
    }
    ```
*   **Response (`409 Conflict`)**:
    ```json
    {
      "success": false,
      "error": {
        "statusCode": 409,
        "code": "CALENDAR_OVERLAP",
        "message": "Rescheduling failed. Overlaps with an existing job booking."
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Job `$JOB_ID` belongs to auth tradie. JWT stored in `$TOKEN`.
    *   **Test Request (Success)**:
        ```bash
        curl -X PATCH -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"scheduledStart": "2026-05-28T14:00:00+10:00", "scheduledEnd": "2026-05-28T16:00:00+10:00"}' \
          "http://localhost:3000/api/v1/jobs/$JOB_ID/reschedule"
        ```
    *   **Expected Assertions (Success)**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and reschedule details inside `data`.
        *   **Database Validation**: Update to `jobs` table commits successfully with new scheduling dates.
    *   **Expected Assertions (Conflict)**: Try rescheduling to a slot that overlaps with another active job.
        *   **HTTP Status**: `409 Conflict`
        *   **Response**: Standardized error envelope with `success: false` and `CALENDAR_OVERLAP` nested in `error`.

---

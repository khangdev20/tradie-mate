> Execution order: `03`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [📌 Module 3.2: Xero Integration (Accounting Sync)](./02_module_3_2_xero_integration_accounting_sync.md)

## 📌 Module 3.3: Group Plan & Multi-Tradie Admin View
**Timeline**: Months 20–22
**Focus**: Support small trades businesses with multiple employees.

### Business Value & Adoption Evaluation

**User intention**: "I have more than one person doing jobs; help me see who is doing what."

**Why users will use it**:
*   Team seats are the clearest expansion revenue path.
*   Admin visibility solves a real owner pain once work moves beyond one person.

**Adoption risk**:
*   Permissions mistakes can expose financial/customer data to subcontractors.
*   If member onboarding is too heavy, admins will keep assigning work by SMS.

**Retention mechanism**:
*   Team assignments, staff history, and role permissions create organisational data gravity.

**Migration support**:
*   Allow invite-by-SMS with a lightweight member app mode.
*   Start with active staff and current jobs, not full historical migration.

**Success metrics**:
*   Invite sent-to-accepted conversion.
*   Jobs assigned to members per week.
*   Team seat expansion rate.
*   Admin weekly active usage.
*   Permission-related support incidents.

**Build detail additions**:
*   Add `organization_memberships` with roles: `OWNER`, `ADMIN`, `FIELD_MEMBER`, `SUBCONTRACTOR`.
*   Add audit log for assignment, reassignment, role changes, and document blocks.
*   Add member capability matrix before endpoint implementation.
*   Integrate with Module 1.5 subscription entitlements by enforcing `teamMembersLimit` on invites and active members.
*   Add seat billing events when a team member is activated, deactivated, or moved between billable/non-billable roles.
*   Keep seat pricing data-driven through Stripe prices/add-ons; do not hard-code per-seat AUD amounts in team assignment logic.

### 📱 Mobile & Web UX Specifications (React Native & Web)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 👥 Profile/Team Switcher Panel
*   **Context Switcher Header**:
    *   For admin owners, render a top selector bar showing active staff profiles.
    *   Tapping an employee profile switches the active map overlays and dashboard view to show that employee's jobs and locations.
    *   Display a badge on each staff member's avatar showing their role tag (e.g. `Owner`, `Admin`, `Sub-Contractor`).

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  abn: varchar('abn', { length: 15 }).notNull(),
});

export const organizationMemberships = pgTable('organization_memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  tradieId: uuid('tradie_id').notNull(),
  role: varchar('role', { length: 50 }).notNull(), // OWNER | ADMIN | FIELD_MEMBER | SUBCONTRACTOR
  status: varchar('status', { length: 50 }).default('INVITED').notNull(), // INVITED | ACTIVE | DISABLED
  isBillableSeat: boolean('is_billable_seat').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Alter tradies schema to add organizationId column:
// organizationId: uuid('organization_id')
```

#### 🛣️ Endpoints Details

##### 1. `GET /api/v1/admin/members`
*   **Auth**: Bearer JWT. Enforce that `request.user.role === 'ADMIN'`.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "members": [
          {
            "id": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0666",
            "fullName": "Alice Electrician",
            "role": "MEMBER",
            "status": "ACTIVE"
          }
        ]
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Authenticated user has role `ADMIN`. JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/admin/members"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and member array inside `data`.
        *   **Database Validation**: Asserts a read query to `tradies` table filtered by `organization_id`.

##### 2. `POST /api/v1/admin/members/invite`
*   **Auth**: Bearer JWT. Enforce that `request.user.role === 'ADMIN'` or owner capability.
*   **Request Body**:
    ```json
    {
      "phone": "+61412345678",
      "fullName": "Alice Electrician",
      "role": "FIELD_MEMBER"
    }
    ```
*   **Business Logic**:
    *   Load effective entitlements from Module 1.5.
    *   Count active billable seats for the organization.
    *   If active billable seats >= `teamMembersLimit`, block invite and return `403 Forbidden`.
    *   Create `organization_memberships` row with status `INVITED`.
    *   Send invite SMS with app install/deep link.
    *   If the billing model uses Stripe subscription quantity, queue a billing update after the member accepts and becomes `ACTIVE`.
*   **Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "data": {
        "memberId": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0666",
        "status": "INVITED"
      }
    }
    ```
*   **Response (`403 Forbidden`)**:
    ```json
    {
      "success": false,
      "error": {
        "statusCode": 403,
        "code": "TEAM_SEAT_LIMIT_REACHED",
        "message": "Upgrade your plan or remove a team member to invite another field member."
      }
    }
    ```

##### 3. `POST /api/v1/admin/jobs/assign`
*   **Auth**: Bearer JWT. Enforce Admin capability bounds.
*   **Request Body**:
    ```json
    {
      "jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345",
      "assigneeId": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0666"
    }
    ```
*   **Business Logic**:
    *   Verify the job and the target assignee belong to the admin owner's organization.
    *   Verify target has document status verification complete (`Verified` documents). If blocked, throw `400 Bad Request`.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "message": "Job successfully assigned."
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Authenticated admin, target assignee has active verified documents, job is currently unassigned. JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345", "assigneeId": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0666"}' \
          "http://localhost:3000/api/v1/admin/jobs/assign"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and success message inside `data`.
        *   **Database Validation**: Table `jobs` has column `tradie_id` updated to `assigneeId`.

---

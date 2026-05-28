> Execution order: `01`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [Phase Overview](./00_phase_overview.md)

## 📌 Module 3.1: Earnings Dashboard (V2)
**Timeline**: Months 19–21
**Focus**: Professional financial charts, breakdown analysis, and payout tracking.

### Business Value & Adoption Evaluation

**User intention**: "Show me what I earned, what is unpaid, and what I can take out."

**Why users will use it**:
*   Money visibility is emotionally sticky and creates frequent check-ins.
*   Payout transparency reduces payment distrust.

**Adoption risk**:
*   If data does not reconcile with Stripe/Xero/bank reality, users will stop trusting the dashboard.
*   Vanity charts without decisions will not drive retention.

**Retention mechanism**:
*   Earnings history, unpaid invoices, and payout state make TradieMate part of weekly financial review.

**Migration support**:
*   Show "last 30 days imported/recorded earnings" after CSV/Xero import so new users see value immediately.

**Success metrics**:
*   Weekly dashboard open rate.
*   Unpaid invoice follow-up rate.
*   Early payout request rate and repeat rate.
*   Reconciliation support tickets.

**Build detail additions**:
*   Separate `grossCollected`, `platformFees`, `stripeFees`, `gstCollected`, and `netPayout`.
*   Add exportable earnings summary for accountants.
*   Add analytics events for period changes, payout modal opens, and payout confirms.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 📊 Charts & Analytics Tab Interaction
*   **Period Selector Tabs**:
    *   Interactive segments (`This Week` / `This Month` / `This Year`).
    *   *Active State*: Filled with Forest Green CTA (`#2E6B45`), white text, and a `0.5px` CTA border.
    *   *Inactive State*: White background, muted gray text, no shadow.
    *   *Transition*: Run a smooth horizontal slide selector highlight behind the text labels.
*   **Interactive 7-Day Bar Chart**:
    *   Render vertical bars using Forest Green.
    *   **Tap-on-Bar Tooltip**: Tapping a bar renders a floating popover tooltip containing the exact earnings value (e.g., `"$1,420.50"`).
    *   Trigger `impactLight` haptic feedback on select. Slightly scale up the active bar (`scaleY: 1.05`) while dimming adjacent bars.

#### 💸 Payout Request UX
*   **Early Payout Action**:
    *   Provide a primary action button: `Request Early Payout`.
    *   *Pressed State*: Translation offset `translateY: 2`, reducing the bottom border height.
    *   *Confirmation Modal*: Displays a fee breakdown: *"Instant transfer fee: $1.50. Net payout amount: $4,582.10"*. Requires a continuous double-tap or a `Swipe to Confirm Payout` action to prevent accidental requests.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const payouts = pgTable('payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradieId: uuid('tradie_id').notNull(),
  amount: integer('amount').notNull(), // Stored in Cents
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // 'PENDING' | 'COMPLETED' | 'FAILED'
  stripePayoutId: varchar('stripe_payout_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `GET /api/v1/earnings/stats`
*   **Auth**: Bearer JWT.
*   **Query Parameters**:
    ```json
    {
      "period": "string (week | month | year)"
    }
    ```
*   **Business Logic**:
    *   Fetch all invoices belonging to the tradie with status `'PAID'` falling in the computed timeline window.
    *   Sum `amountTotal` (representing earnings) and calculate job completion totals.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "totalEarned": 1245000,
        "jobsCount": 42,
        "avgJobValue": 29642,
        "pendingPayout": 158210,
        "chartData": [
          { "day": "Mon", "amount": 12000 },
          { "day": "Tue", "amount": 35000 }
        ]
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Tradie has active, paid jobs in the system within the specified timeline (week/month/year). JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/earnings/stats?period=week"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and statistical details inside `data`.
        *   **Database Validation**: Asserts a sum read from `invoices` where status is `'PAID'` filtered by date range and `tradie_id`.

##### 2. `POST /api/v1/earnings/payouts`
*   **Auth**: Bearer JWT.
*   **Request Body**: `{}`
*   **Business Logic**:
    *   Retrieve available balance from Stripe Connect connected account balance registry.
    *   Trigger a Stripe Payout operation:
        ```javascript
        const payout = await stripe.payouts.create({
          amount: tradie.pendingBalance,
          currency: 'aud',
          method: 'instant'
        }, {
          stripeAccount: tradie.stripeConnectedAccountId
        });
        ```
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "payoutId": "po_1H5abc123",
        "amount": 158210,
        "status": "PENDING"
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Tradie has a Stripe Connected Account with positive `pendingBalance`. JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/earnings/payouts"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and payout details inside `data`.
        *   **Database Validation**: Row added to `payouts` table in `PENDING` state.
        *   **Side Effects**: Triggers a Stripe Connect Transfer to route funds via Stripe API.

---

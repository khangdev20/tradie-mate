> Execution order: `04`  
> Parent phase: [Phase 4 — Pure Product (M31+)](../phase_4_pure_product.md)  
> Previous: [📌 Module 4.3: AI Voice Agent (Vapi.ai Integration)](./03_module_4_3_ai_voice_agent_vapi_ai_integration.md)

## 📌 Module 4.4: Marketplace & Payment Escrow
**Timeline**: Month 38+
**Focus**: Public directory for bookings with escrow protection.

### Business Value & Adoption Evaluation

**User intention**: "Bring me customers who are ready to pay, and protect both sides."

**Why users will use it**:
*   Tradies will care if the marketplace brings incremental paid work, not merely profile views.
*   Customers and property managers care about verified credentials, reviews, escrow, and dispute paths.

**Adoption risk**:
*   Marketplace liquidity is hard: without demand, tradies churn; without supply, customers churn.
*   Escrow disputes create operational and legal complexity.
*   Lead quality must be better than generic marketplaces to justify switching.

**Retention mechanism**:
*   Marketplace jobs create revenue dependency and reinforce the value of verified profiles, reviews, and completion evidence.

**Migration support**:
*   Give tradies direct booking links first, then aggregate into marketplace once profile/review density exists.
*   Offer imported reviews/testimonials as unverified showcase content while clearly labeling verified TradieMate reviews.

**Success metrics**:
*   Search-to-booking conversion.
*   Booking acceptance rate.
*   Job completion rate.
*   Escrow release time.
*   Dispute rate and resolution time.
*   Repeat booking rate.
*   Tradie incremental revenue from marketplace jobs.

**Build detail additions**:
*   Add marketplace ranking inputs: verified docs, response time, completion rate, rating, distance, availability.
*   Add cancellation/no-show policies before taking marketplace payments.
*   Add support tooling for disputes, evidence review, refunds, and partial releases.

### 📱 Tradie Mobile UX (React Native App)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.
#### 📸 Proof of Completion Screen
*   **Sign-Off Interface**:
    *   Provides two upload boxes for job photos: "Before" and "After".
    *   Requires the customer's digital signature in the canvas modal (customer signs directly on the tradie's screen).
    *   Tapping `Submit Completion` shows a loading wheel inside the button and triggers a confirmation alert.

### 🖥️ Customer Web Escrow UX (Mobile-Responsive Web Page)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.
*   *Note: There is no native customer mobile app; escrow approvals are collected via a web link sent by SMS/Email.*
#### 💳 Customer Web Escrow Release Page
*   **Layout & Interactive Buttons**:
    *   Sent to the customer via SMS/Email after completion.
    *   **Primary Action**: Large Success Green (`#2E6B45`) button: `Approve & Release Payment` (`52px` height, `0.5px` border, no shadow).
    *   **Secondary Action**: Muted gray button: `Raise Dispute`.
*   **Dispute Flow UX**:
    *   Tapping `Raise Dispute` opens a form card.
    *   *Form details*: Text field requiring details, with a file upload button to submit photo evidence.
    *   *Visual Confirmation*: On submission, change the page state to show a locked banner: *"Escrow Locked — Support ticket opened"*. Trigger an email alert to both parties.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const escrowTransactions = pgTable('escrow_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull(),
  chargeId: varchar('charge_id', { length: 255 }).notNull(), // Stripe Charge identifier
  amount: integer('amount').notNull(), // Stored in Cents
  escrowStatus: varchar('escrow_status', { length: 50 }).default('HELD').notNull(), // 'HELD' | 'RELEASED' | 'DISPUTED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const jobDisputes = pgTable('job_disputes', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 50 }).default('OPEN').notNull(), // 'OPEN' | 'RESOLVED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/marketplace/bookings`
*   **Request Body**:
    ```json
    {
      "tradieId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "customerName": "Robert Brown",
      "customerPhone": "+61488888888",
      "amount": 25000,
      "stripePaymentMethodId": "pm_1Fabc123"
    }
    ```
*   **Business Logic (Escrow Initialization)**:
    *   Create a Stripe charge with `transfer_group` referencing the job id, holding the funds in the platform balance:
        ```javascript
        const charge = await stripe.charges.create({
          amount: 25000,
          currency: 'aud',
          source: stripePaymentMethodId,
          capture: true // Capture and hold in escrow
        });
        ```
    *   Insert a row into `jobs` (status `'PENDING'`) and `escrow_transactions` (status `'HELD'`).
*   **Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "data": {
        "bookingId": "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "status": "CONFIRMED"
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Stripe customer payment method `pm_1Fabc123` is valid.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Content-Type: application/json" \
          -d '{"tradieId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", "customerName": "Robert Brown", "customerPhone": "+61488888888", "amount": 25000, "stripePaymentMethodId": "pm_1Fabc123"}' \
          "http://localhost:3000/api/v1/marketplace/bookings"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `201 Created`
        *   **Response**: Standardized envelope with `success: true` and booking details inside `data`.
        *   **Database Validation**: Row added to `jobs` and `escrow_transactions` (with status `'HELD'`).
        *   **Side Effects**: Invokes Stripe API to create a charge and holds funds in platform balance using `transfer_group`.

##### 2. `POST /api/v1/jobs/:id/approve-completion`
*   **Auth**: Secure webhook/link signature verification.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "message": "Payment released to tradie."
      }
    }
    ```
*   **Business Logic**:
    *   Verify the job is marked `'COMPLETED'`.
    *   Fetch the `escrow_transactions` row. If state is not `'HELD'`, reject.
    *   Execute Stripe Connect Transfer to route the funds from the platform balance directly to the tradie's connected Stripe account:
        ```javascript
        await stripe.transfers.create({
          amount: escrow.amount,
          currency: 'aud',
          destination: tradie.stripeConnectedAccountId,
          transfer_group: job.id
        });
        ```
    *   Update `escrowStatus` to `'RELEASED'`.
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Job is completed and escrow transaction exists with state `'HELD'`. Signed link token is provided.
    *   **Test Request**:
        ```bash
        curl -X POST "http://localhost:3000/api/v1/jobs/$JOB_ID/approve-completion"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and success message inside `data`.
        *   **Database Validation**: Column `escrowStatus` in `escrow_transactions` updated to `'RELEASED'`.
        *   **Side Effects**: Stripe Connect Transfer is executed routing funds to tradie's Stripe Connected account balance.

##### 3. `POST /api/v1/jobs/:id/dispute`
*   **Request Body**:
    ```json
    {
      "reason": "Tradie left the work unfinished."
    }
    ```
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "disputeId": "d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "status": "OPEN"
      }
    }
    ```
*   **Business Logic**:
    *   Update the `escrow_transactions` state for the job to `'DISPUTED'` (freezing payouts).
    *   Insert a new row into `job_disputes`.
    *   Trigger support email alerts to administrators.
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Escrow transaction exists with state `'HELD'`.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Content-Type: application/json" \
          -d '{"reason": "Tradie left the work unfinished."}' \
          "http://localhost:3000/api/v1/jobs/$JOB_ID/dispute"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and dispute details inside `data`.
        *   **Database Validation**: Column `escrowStatus` in `escrow_transactions` is set to `'DISPUTED'`, freezing payment. Row added to `job_disputes` table with status `'OPEN'`.
        *   **Side Effects**: Platform support email alert dispatched to administrators.

---

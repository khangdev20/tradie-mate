> Execution order: `04`  
> Parent phase: [Phase 2 — Transition & Grow (M9–M18)](../phase_2_transition_grow.md)  
> Previous: [📌 Module 2.3: Google & Apple SSO Authentication](./03_module_2_3_google_apple_sso_authentication.md)

## 📌 Module 2.4: Profiles & Customer Reviews
**Timeline**: Months 14–16
**Focus**: Customer reviews and public tradie profiles.

### Business Value & Adoption Evaluation

**User intention**: "Turn finished work into proof that helps me win the next job."

**Why users will use it**:
*   Reviews are a direct business asset, especially for tradies moving away from rented marketplace reputation.
*   Public profile can become the link tradies send instead of a Facebook page or marketplace profile.

**Adoption risk**:
*   Customers may ignore review links unless timing and copy are good.
*   Tradies may fear negative reviews if they cannot respond or resolve issues.

**Retention mechanism**:
*   Review history and public profile content create reputation data that makes the account more valuable over time.
*   Replies let tradies manage customer perception from inside TradieMate.

**Migration support**:
*   Add review import/manual showcase later for users with Google/Facebook reviews.
*   Provide "request review" SMS after invoice paid to help tradies build owned reputation.

**Success metrics**:
*   Review request send rate.
*   Review completion rate.
*   Average rating and reply rate.
*   Public profile view-to-call/rebook conversion.
*   Number of repeat bookings from profile links once booking links exist.

**Build detail additions**:
*   Add signed review tokens with expiry and one-review-per-job enforcement.
*   Add `publicProfileSlug`, `profilePublishedAt`, and profile visibility settings.
*   Add moderation/reporting workflow for abusive or fraudulent reviews.

### 📱 Tradie Mobile UX (React Native App)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.
*   **Specialty Tag Selection**:
    *   Show options as a list of large selectable chips (`40px` height).
    *   *Active State*: Active chips switch to Forest Green CTA (`#2E6B45`) with white text and a `0.5px` CTA border.
    *   *Inactive State*: Inactive chips use `#EDECEA` (`--bg-surface`) with a `0.5px` border and no shadow.
*   **Base Rate Slider**:
    *   Provide a slider element to set the hourly rate ($85 to $150/hr).
    *   As the slider moves, render a floating tooltip above the handle displaying the current value (e.g., `"$120/hr"`).
    *   Format numbers as currency. Use haptic `selection` clicks as the handle slides past $5 increments.
*   **Reviews Screen**:
    *   List reviews received on jobs. Displays ratings summaries and a form to submit replies to reviews.

### 🖥️ Customer Web Reviews UX (Mobile-Responsive Web Page)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.
*   *Note: There is no native customer mobile app; reviews are collected via a web link sent by SMS/Email after billing.*
*   **Review Stars Component**:
    *   Show rating stars with MCI `star` icons at `32px`; do not draw custom unicode stars.
    *   Filled stars: Warning (`#BA7517`). Empty stars: `#D3D1C7` (`--stone-light`).
*   **Tap-to-Rate Interaction**:
    *   When a customer selects a rating (1 to 5 stars), execute a bounce spring animation (`scale: 1.3` transitioning to `1.0`) on the selected stars. No haptic feedback is available in simple web browsers, so prioritize quick visual scale feedback instead.
*   **Feedback Box**:
    *   Textarea for custom message. Display dynamic character limit warning: *"Please write at least 10 characters to submit."*
    *   On successful submission, display a full-page thank-you card. Clear form inputs and lock the page state to prevent duplicate postings.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull(),
  tradieId: uuid('tradie_id').notNull(),
  rating: integer('rating').notNull(), // Range: 1-5
  reviewText: text('review_text').notNull(),
  responseText: text('response_text'), // Tradie's response/reply
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/reviews`
*   **Auth**: Public endpoint (validated via secure tracking session tokens in headers).
*   **Request Body**:
    ```json
    {
      "jobId": "7fa85c8e-5b12-42da-912f-92762a4d3345",
      "rating": 5,
      "reviewText": "Excellent service, Dave fixed the leak immediately."
    }
    ```
*   **Business Logic**:
    *   Check tracking token validity. If invalid, return `401 Unauthorized`.
    *   Verify that the `jobId` has status `COMPLETED` and the linked invoice `paymentStatus` is `'PAID'`. If not, return `400 Bad Request`.
    *   Verify if a review has already been submitted for this job ID. If yes, reject.
*   **Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "d3b8a64d-3b7c-4a9b-90f7-1cb7b77a0999"
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Job `$JOB_ID` status is `COMPLETED` and invoice payment is `PAID`. Active tracking session token `$TRACKING_TOKEN` is passed in request headers.
    *   **Test Request**:
        ```bash
        curl -X POST -H "X-Tracking-Token: $TRACKING_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"jobId": "'"$JOB_ID"'", "rating": 5, "reviewText": "Excellent service, Dave fixed the leak immediately."}' \
          "http://localhost:3000/api/v1/reviews"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `201 Created`
        *   **Response**: Standardized envelope with `success: true` and review details inside `data`.
        *   **Database Validation**: Table `reviews` contains 1 new row matching the job and rating. Duplicate submissions for the same `jobId` are rejected with a conflict error.

##### 2. `PATCH /api/v1/reviews/:id/reply`
*   **Auth**: Bearer JWT.
*   **Request Body**:
    ```json
    {
      "responseText": "Thank you for the feedback! Happy to help."
    }
    ```
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "reviewId": "d3b8a64d-3b7c-4a9b-90f7-1cb7b77a0999",
        "responseText": "Thank you for the feedback! Happy to help."
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Review `$REVIEW_ID` belongs to the authenticated tradie. JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -X PATCH -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"responseText": "Thank you for the feedback! Happy to help."}' \
          "http://localhost:3000/api/v1/reviews/$REVIEW_ID/reply"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and updated response details inside `data`.
        *   **Database Validation**: Table `reviews` column `response_text` is updated with the reply text.

---

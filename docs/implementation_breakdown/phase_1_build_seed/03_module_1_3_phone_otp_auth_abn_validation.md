> Execution order: `03`  
> Parent phase: [Phase 1 — Build & Seed (M1–M8)](../phase_1_build_seed.md)  
> Previous: [📌 Module 1.2: Invoice & Stripe Tap to Pay](./02_module_1_2_invoice_stripe_tap_to_pay.md)

## 📌 Module 1.3: Phone OTP Auth & ABN Validation
**Timeline**: Week 4
**Focus**: Mobile registration with instant, legally compliant credential verification.

### Business Value & Adoption Evaluation

**User intention**: "Let me start quickly, but prove I am a legitimate business."

**Why users will use it**:
*   Phone OTP matches how tradies already operate and avoids password fatigue.
*   ABN verification helps build customer and marketplace trust later.

**Adoption risk**:
*   Strict ABN validation too early can block legitimate beta users because of data entry mismatch, entity-name mismatch, or ABR API issues.
*   Long onboarding before first value will reduce activation.

**Retention mechanism**:
*   A verified business profile becomes trust capital that can be reused for reviews, public profile, enterprise dispatch, and marketplace bookings.

**Migration support**:
*   Make initial onboarding progressive: phone -> first job -> ABN/profile completion before payment or public profile activation.
*   Allow manual review fallback for ABN/API mismatches.

**Success metrics**:
*   OTP request-to-verify conversion.
*   ABN verification pass/fail/manual-review rate.
*   Time from install to first job created.
*   Onboarding drop-off by step.

**Build detail additions**:
*   Add onboarding step tracking table or event stream.
*   Add `abnVerificationReason` and `abnVerifiedAt`.
*   Add manual review status: `UNVERIFIED`, `PENDING_MANUAL_REVIEW`, `VERIFIED`, `REJECTED`.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 🔐 OTP Verification Flow
*   **Input Box Architecture**:
    *   Use six distinct, large square text fields (`56px x 56px`) with a double-width outline (`0.5px` solid `#E8E6E0`).
    *   *Interaction*: Auto-focus the first box on render. When a digit is entered, auto-focus the next field. Pressing backspace must clear the current field and move focus back to the previous input.
    *   Highlight the currently active input field with a solid Forest Green CTA border (`#2E6B45`).
*   **Resend Timer**:
    *   Display a countdown timer: *"Resend code in 01:59"*. Disable the resend link until the countdown hits zero.

#### 🏢 ABN Registry Input Validation
*   **Formatting**:
    *   Format the input value automatically on keypress to match standard Australian ABN groupings: `XX XXX XXX XXX` (e.g., `12 345 678 901`).
*   **ABN Verification States**:
    *   **Luhn-Check Validation**: Run the ABN Luhn algorithm locally on the device.
    *   *Visual States*:
        *   While typing (< 11 digits): Neutral outline.
        *   Invalid format/Luhn check failed: Border changes to Danger Red (`#E24B4A`), showing a clear inline error: *"Invalid ABN format"*.
        *   Format matches & Luhn check passes: Border changes to Success Green (`#639922`), indicating the record is ready to check against the ATO database.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const tradies = pgTable('tradies', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  abn: varchar('abn', { length: 15 }),
  abnVerified: varchar('abn_verified', { length: 20 }).default('UNVERIFIED').notNull(), // 'UNVERIFIED' | 'VERIFIED'
  tradeType: varchar('trade_type', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/auth/request-otp`
*   **Request Body**:
    ```json
    {
      "phone": "+61412345678"
    }
    ```
*   **Business Logic & Rate Limiting**:
    *   Redis is queried for key `rate_limit:otp:${phone}`.
    *   If value exists and >= 3, reject request and return `429 Too Many Requests`.
    *   Generate a dynamic Redis counter increment with a TTL (expire time) of `10 minutes`.
    *   Call Twilio Verify API to dispatch the verification code to the target device.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "message": "Verification code sent successfully."
      }
    }
    ```
*   **Response (`429 Too Many Requests`)**:
    ```json
    {
      "success": false,
      "error": {
        "statusCode": 429,
        "code": "OTP_RATE_LIMIT",
        "message": "Too many verification requests. Please try again in 10 minutes."
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: A valid Twilio Sandbox/Production configuration.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Content-Type: application/json" \
          -d '{"phone": "+61412345678"}' \
          "http://localhost:3000/api/v1/auth/request-otp"
        ```
    *   **Expected Assertions (First Call)**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and success message inside `data`.
        *   **Side Effects**: Redis key `rate_limit:otp:+61412345678` incremented by 1 (TTL 10m). Twilio dispatched SMS.
    *   **Expected Assertions (4th consecutive call within 10 mins)**:
        *   **HTTP Status**: `429 Too Many Requests`
        *   **Response**: Standardized error envelope with `success: false` and `OTP_RATE_LIMIT` nested in `error`.

##### 2. `POST /api/v1/auth/verify-otp`
*   **Request Body**:
    ```json
    {
      "phone": "+61412345678",
      "code": "123456"
    }
    ```
*   **Business Logic**:
    *   Call Twilio Verify verification checks. If invalid code, return `400 Bad Request`.
    *   Query database for a user matching the phone number.
    *   If found: Return access token, refresh token, and a `newUser: false` flag.
    *   If not found: Register standard auth credentials placeholder, return tokens and a `newUser: true` flag to redirect client to onboarding fields.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "ref_abc123...",
        "newUser": false,
        "user": {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "phone": "+61412345678",
          "fullName": "Dave Plumber",
          "abnVerified": "VERIFIED"
        }
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: OTP code `123456` generated via Twilio verify.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Content-Type: application/json" \
          -d '{"phone": "+61412345678", "code": "123456"}' \
          "http://localhost:3000/api/v1/auth/verify-otp"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and session details inside `data`.
        *   **Database Validation**: If user is registering for the first time, check that a user record was initialized with the phone number and `newUser` is `true`.

##### 3. `POST /api/v1/auth/register`
*   **Request Body**:
    ```json
    {
      "phone": "+61412345678",
      "fullName": "Dave Plumber",
      "abn": "12345678901",
      "tradeType": "Plumbing"
    }
    ```
*   **Business Logic / ABN Verification Flow**:
    *   Calculate Luhn check locally on backend. If it fails, return `400 Bad Request`.
    *   Query ABR (Australian Business Register) API:
        `https://abr.business.gov.au/abrxmlsec/AbrXmlSearch.asmx/SearchByABNv201408?searchString=${abn}&includeHistoricalDetails=N&authenticationGuid=${ABR_GUID}`
    *   *Caching*: Save ABR responses in Redis under key `abr_check:${abn}` with an expiration timer set to `24 hours`.
    *   If ABR returns active company details matching the user profile:
        *   Update ABN status to `VERIFIED` and save to local user columns.
        *   If cancelled or inactive, reject onboarding, return `400 Bad Request`.
*   **Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "fullName": "Dave Plumber",
        "abn": "12345678901",
        "abnVerified": "VERIFIED",
        "tradeType": "Plumbing"
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: User registered a phone number via OTP but hasn't onboarded yet. JWT stored in `$TOKEN`.
    *   **Test Request (Success)**:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"phone": "+61412345678", "fullName": "Dave Plumber", "abn": "12345678901", "tradeType": "Plumbing"}' \
          "http://localhost:3000/api/v1/auth/register"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `201 Created`
        *   **Response**: Standardized envelope with `success: true` and user registration details inside `data`.
        *   **Database Validation**: Update to `tradies` table commits correctly, sets `fullName`, `abn`, `tradeType`, and `abnVerified` based on ATO API details.
        *   **Side Effects**: ATO lookup is run, results cached in Redis under key `abr_check:12345678901` (TTL 24h).

---

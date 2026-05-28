> Execution order: `03`  
> Parent phase: [Phase 2 — Transition & Grow (M9–M18)](../phase_2_transition_grow.md)  
> Previous: [📌 Module 2.2: Tradie Onboarding & Document Verification](./02_module_2_2_tradie_onboarding_document_verification.md)

## 📌 Module 2.3: Google & Apple SSO Authentication
**Timeline**: Months 13–14
**Focus**: Quick, secure, and compliant login methods.

### Business Value & Adoption Evaluation

**User intention**: "Let me get back in fast when I change phone or reinstall the app."

**Why users will use it**:
*   Reduces login friction for returning users.
*   Improves account recovery compared with phone-only flows when SIM/device changes happen.

**Adoption risk**:
*   SSO alone is not a value feature; it should not displace work on money/job workflows.
*   Account linking bugs can create duplicate profiles and split invoice history.

**Retention mechanism**:
*   Easier re-login reduces accidental churn after device replacement.

**Migration support**:
*   Let users continue with phone OTP; add SSO as convenience, not a forced migration.

**Success metrics**:
*   Login success rate.
*   Account recovery success rate.
*   Duplicate account incidents.
*   Percentage of returning users using SSO.

**Build detail additions**:
*   Add account merge tooling for support.
*   Track auth provider linking separately from first-time account creation.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 🔐 Login Buttons UI
*   **Layout Structure**:
    *   Render two large action buttons with a height of `52px`. Use a `0.5px` border and `8px` element radius.
    *   **Apple SSO Button**: Classic solid black background with white Apple logo.
    *   **Google SSO Button**: Pure white background with standard multi-colored Google logo.
*   **SSO Loading State**:
    *   When the user taps an SSO provider, replace the button label text with a loading indicator.
    *   Keep the button size stable to prevent layout shifts. Disable the sibling login option to prevent double-tap race conditions.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const authProvidersEnum = pgEnum('auth_providers_type', ['APPLE', 'GOOGLE', 'PHONE']);

export const authProviders = pgTable('auth_providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradieId: uuid('tradie_id').notNull(),
  providerName: authProvidersEnum('provider_name').notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(), // Unique user identifier from Apple/Google
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/auth/sso`
*   **Request Body**:
    ```json
    {
      "provider": "GOOGLE",
      "idToken": "eyJhbGciOi..."
    }
    ```
*   **Business Logic**:
    *   Backend validates `idToken` using Google/Apple public keys.
    *   Extract email, name, and provider unique ID.
    *   Query `auth_providers` to find user.
    *   If user profile exists: generate and return standard JWT + refresh token.
    *   If no matching provider linked: check if a user with the same email exists in the database.
        *   If yes, link the new auth provider to the existing account.
        *   If no email exists, create a new record in `tradies` and `auth_providers`, then return session tokens.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "ref_xyz789...",
        "user": {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "fullName": "Dave Plumber",
          "phone": "+61412345678"
        }
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Google or Apple identity platform ID Token `$ID_TOKEN` is generated on the client.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Content-Type: application/json" \
          -d '{"provider": "GOOGLE", "idToken": "'"$ID_TOKEN"'"}' \
          "http://localhost:3000/api/v1/auth/sso"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and SSO credentials inside `data`.
        *   **Database Validation**: Row added to `auth_providers` if this is a first connection. If email matches an existing user, links provider. If no profile exists, registers user in `tradies` and `auth_providers` tables.

---

> Execution order: `02`  
> Parent phase: [Phase 2 — Transition & Grow (M9–M18)](../phase_2_transition_grow.md)  
> Previous: [📌 Module 2.1: Customer Live Geolocation Tracking](./01_module_2_1_customer_live_geolocation_tracking.md)

## 📌 Module 2.2: Tradie Onboarding & Document Verification
**Timeline**: Months 10–11
**Focus**: Verification flows to guarantee Australian legal compliance prior to job dispatch.

### Business Value & Adoption Evaluation

**User intention**: "Show customers and business clients that I am qualified and insured."

**Why users will use it**:
*   Verification enables trust badges, public profile credibility, enterprise work, and marketplace eligibility.
*   Document reminders reduce the risk of expired licence/insurance blocking revenue.

**Adoption risk**:
*   Uploading documents is effort-heavy and can create onboarding friction.
*   OCR false negatives may frustrate legitimate users.

**Retention mechanism**:
*   TradieMate becomes the compliance record for licence, public liability, white card, and police check.
*   Renewal reminders create recurring operational value.

**Migration support**:
*   Offer "verified profile" as a reason to move from generic lead platforms.
*   Allow users to upload PDFs/photos from existing insurer/accountant emails.

**Success metrics**:
*   Document upload completion rate.
*   OCR auto-approval rate.
*   Manual review rate and median review time.
*   Number of jobs blocked due to expired documents.
*   Renewal reminder conversion rate.

**Build detail additions**:
*   Add `verificationAttempts`, `reviewedBy`, `reviewedAt`, and `rejectionReason`.
*   Add expiry reminder queue at 60/30/7 days before expiry.
*   Add admin review dashboard before automating all edge cases.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 🚶 Step Stepper UX
*   **Stepper Navigation**:
    *   Position a static setup header with an `8px` high progress track bar.
    *   Fill the progress bar dynamically with a Success Green track (`#639922`) indicating the progress percentage.
    *   Provide smooth horizontal slide transitions (`translateX` via Reanimated) when moving between steps.

#### 📷 Camera & Scan Capture UI
*   **Camera Integration**:
    *   Use `react-native-vision-camera` to show a camera screen.
    *   Superimpose a clear Forest Green rectangular guideline mask (`0.5px` border, `#2E6B45`) on screen to guide the document placement (representing a physical card).
*   **Document Cropping & Upload UX**:
    *   After capturing, display the cropped preview image on screen.
    *   *Scan Loading State*: While executing the OCR text recognition, show a full-screen shimmer overlay: *"Analyzing license details... please wait."*
    *   *Verification Badges*: Once the ABN, Trade Licence, and Insurance are uploaded, display clear, uppercase status labels: `VERIFIED` (Success Green) or `EXPIRED` (Danger Red) prominently inside a card layout.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
import { pgEnum, date } from 'drizzle-orm/pg-core';

export const documentTypeEnum = pgEnum('document_type', ['LICENCE', 'LIABILITY_INSURANCE', 'WHITE_CARD', 'POLICE_CHECK']);
export const documentStatusEnum = pgEnum('document_status', ['PENDING', 'VERIFIED', 'EXPIRED']);

export const tradieDocuments = pgTable('tradie_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  tradieId: uuid('tradie_id').notNull(),
  documentType: documentTypeEnum('document_type').notNull(),
  documentNumber: varchar('document_number', { length: 100 }),
  expiryDate: date('expiry_date').notNull(),
  status: documentStatusEnum('status').default('PENDING').notNull(),
  fileUrl: varchar('file_url', { length: 512 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/documents/upload`
*   **Auth**: Bearer JWT.
*   **Content-Type**: `multipart/form-data`
*   **Request Params**:
    *   `file`: Binary file data.
    *   `documentType`: `'LICENCE' | 'LIABILITY_INSURANCE' | 'WHITE_CARD' | 'POLICE_CHECK'`
*   **Business Logic**:
    *   Upload binary payload to Amazon S3 (Sydney bucket `ap-southeast-2`).
    *   Trigger asynchronous background OCR processing (AWS Textract or Google Document AI) to check metadata elements (document number, expiry date, provider details).
    *   Create `tradie_documents` record initialized with `'PENDING'` status.
*   **Response (`202 Accepted`)**:
    ```json
    {
      "success": true,
      "data": {
        "documentId": "c3b8a64d-3b7c-4a9b-90f7-1cb7b77a0123",
        "status": "PENDING",
        "fileUrl": "https://s3.ap-southeast-2.amazonaws.com/tradiemate-docs/c3b8a64d.pdf"
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: JWT stored in `$TOKEN`. Valid local PDF or image file `licence.pdf`.
    *   **Test Request**:
        ```bash
        curl -X POST -H "Authorization: Bearer $TOKEN" \
          -F "documentType=LICENCE" \
          -F "file=@licence.pdf" \
          "http://localhost:3000/api/v1/documents/upload"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `202 Accepted`
        *   **Response**: Standardized envelope with `success: true` and upload details inside `data`.
        *   **Database Validation**: New row inserted in `tradie_documents` table with status `'PENDING'`.
        *   **Side Effects**: File uploaded to S3 Sydney bucket (`ap-southeast-2`). Asynchronous OCR worker (AWS Textract or Google Document AI) triggered to analyze the license.

---

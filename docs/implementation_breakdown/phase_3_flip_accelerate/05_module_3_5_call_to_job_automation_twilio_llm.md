> Execution order: `05`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [📌 Module 3.4: Scheduling & Calendar Module](./04_module_3_4_scheduling_calendar_module.md)

## 📌 Module 3.5: Call-to-Job Automation (Twilio + LLM)
**Timeline**: Months 23–25
**Focus**: Automatically transcribe incoming phone calls and generate structured job records.

### Business Value & Adoption Evaluation

**User intention**: "Do not lose paid work while I am driving, under a sink, or with another customer."

**Why users will use it**:
*   Missed calls are direct revenue leakage.
*   Structured drafts reduce the mental load of remembering caller details.

**Adoption risk**:
*   AI extraction mistakes can send a tradie to the wrong address or create customer trust issues.
*   Forwarding business calls requires high trust in reliability and call handling.

**Retention mechanism**:
*   Once calls turn into job drafts reliably, the app becomes part of lead capture.

**Migration support**:
*   Start as voicemail/transcription assistant before replacing phone handling.
*   Allow forwarding only after business hours or when tradie toggles "busy".

**Success metrics**:
*   Calls captured.
*   Draft job acceptance rate.
*   Parsed address correction rate.
*   Lead-to-booked-job conversion.
*   Missed-call reduction for enrolled users.

**Build detail additions**:
*   Store raw webhook before LLM processing and make extraction idempotent.
*   Add confidence scores per extracted field.
*   Require tradie confirmation before customer-facing booking messages are sent.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 🔔 Call Alert Notification UX
*   **Interactive Call Intake Notification**:
    *   Tapping the Call-to-Job push notification opens a dedicated review modal.
    *   **Layout**: Displays the original call transcript snippet, highlighting key parsed details (e.g. name, address) in yellow markers.
    *   **Action Buttons**: Large side-by-side buttons: `Confirm Booking` (Success Green) and `Reject Draft` (Danger Red). Pressing triggers haptic feedback.

---

### 🔌 API & Database Specification

#### 🗄️ Drizzle Database Schema (`src/db/schema.ts`)
```typescript
export const callTranscripts = pgTable('call_transcripts', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull(),
  callerPhone: varchar('caller_phone', { length: 20 }).notNull(),
  transcriptText: text('transcript_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

#### 🛣️ Endpoints Details

##### 1. `POST /api/v1/webhooks/twilio-call`
*   **Auth**: Secure signature header hook from Twilio.
*   **Request Body**:
    ```json
    {
      "From": "+61412345678",
      "TranscriptionText": "Hi Dave, I need a plumber. There is a leaking pipes burst in my backyard at 12 High St, Brisbane. Call me back please."
    }
    ```
*   **Business Logic & LLM Prompts**:
    *   Send the transcription payload to OpenAI/Claude:
        *   Prompt: *"Extract: Customer Name, Phone, Job Description, Address, Urgency (Routine/Urgent). Output JSON only."*
    *   Insert a `DRAFT` job into `jobs` table, and write raw transcript into `call_transcripts`.
    *   Dispatch push notifications with actions to confirm or reject the booking.
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "draftJobId": "e2a1b94d-e9c8-419b-a67b-1cb8b77a0011"
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: Twilio Signature header validation is set up.
    *   **Test Request**:
        ```bash
        curl -X POST -H "X-Twilio-Signature: mock_signature" \
          -H "Content-Type: application/json" \
          -d '{"From": "+61412345678", "TranscriptionText": "Hi Dave, I need a plumber. There is a leaking pipes burst in my backyard at 12 High St, Brisbane. Call me back please."}' \
          "http://localhost:3000/api/v1/webhooks/twilio-call"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and draft details inside `data`.
        *   **Database Validation**: Table `call_transcripts` has 1 new row. A `DRAFT` job record is inserted in the `jobs` table.
        *   **Side Effects**: LLM (OpenAI/Claude API) parses caller transcription details. FCM pushes alert to tradie device.

---

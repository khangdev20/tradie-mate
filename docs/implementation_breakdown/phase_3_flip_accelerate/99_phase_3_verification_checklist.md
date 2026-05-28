> Execution order: `99`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [🧪 Phase 3 Module Test Cases](./90_phase_3_module_test_cases.md)

## 🧪 Phase 3 Verification Checklist

### 1. Automated Tests
- Test queue integration: Mock Xero API responses and verify the worker retries failed connections.
- Test LLM prompt logic by mocking typical raw tradie call logs. Verify the output parsing format is structured.

### 2. Manual Verification
- **Twilio Calling**: Place a test call to the Twilio proxy number. Verify that transcription triggers, a draft job record is created in Postgres, and an FCM notification lands on the phone.
- **Xero OAuth Connection**: Connect the app to a Xero sandbox environment. Generate an invoice in-app, complete a card transaction, and verify the record registers as Paid in Xero within 60 seconds.

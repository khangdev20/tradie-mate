> Execution order: `99`  
> Parent phase: [Phase 1 — Build & Seed (M1–M8)](../phase_1_build_seed.md)  
> Previous: [🧪 Phase 1 Module Test Cases](./90_phase_1_module_test_cases.md)

## 🧪 Phase 1 Verification Checklist

### Manual Verification
*   **Twilio SMS / OTP**: Verify that Twilio handles SMS delivery to AU mobile numbers (+61) with rate limits blocking requests after the 3rd attempt.
*   **Offline Sync Check**: Toggle airplane mode. Create a new invoice, sign on screen, and verify the offline status changes to Warning (`#BA7517`). Turn off airplane mode and confirm the status switches to Online and the invoice data correctly appears in Postgres.
*   **Tap to Pay Reader Discovery**: Trigger payment, confirm the Stripe Terminal SDK local mobile reader discovery overlay launches and prompts for a card scan.
*   **Invoice Sequencing Lock**: Execute consecutive invoice generations rapidly and confirm that invoices are correctly sequential without skipped numbers.
*   **ABN Validation**: Register a new user, typing in an ABN and verify that invalid ABNs are instantly blocked while valid ABNs proceed to verification.
*   **Mapbox Routing Foundation**: Geocode a job address, render the route, deny/re-grant location permission, start commute tracking, and confirm stale/offline map states behave correctly.

> Execution order: `99`  
> Parent phase: [Phase 4 — Pure Product (M31+)](../phase_4_pure_product.md)  
> Previous: [🧪 Phase 4 Module Test Cases](./90_phase_4_module_test_cases.md)

## 🧪 Phase 4 Verification Checklist

### 1. Automated Tests
- Test Vapi webhook validation using mocked HTTP payloads. Verify the JSON matches the schema requirements.
- Run integration tests simulating Stripe Connect payouts, verifying proper routing of commissions.

### 2. Manual Verification
- **Vapi Call Simulation**: Place a test call and verify the bot's speech output includes the required AI disclaimer, logs the call details, and creates a draft job.
- **License Scraper Test**: Trigger a scraper check against a dummy license record and confirm the database state updates to `VERIFIED` or `EXPIRED` based on registry responses.

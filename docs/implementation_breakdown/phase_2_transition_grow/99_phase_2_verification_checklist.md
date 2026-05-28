> Execution order: `99`  
> Parent phase: [Phase 2 — Transition & Grow (M9–M18)](../phase_2_transition_grow.md)  
> Previous: [🧪 Phase 2 Module Test Cases](./90_phase_2_module_test_cases.md)

## 🧪 Phase 2 Verification Checklist

### 1. Automated Tests
- Run integration tests: `npm run test` targeting `/api/v1/jobs/assign` endpoint with expired document mocked database values. Confirm the endpoint strictly throws a `403 Forbidden` response.
- Execute API integration and provider contract tests checking Google/Apple SSO token verification, account linking, and duplicate profile prevention.

### 2. Manual Verification
- **Background Location Battery Test**: Turn on live tracking in physical devices. Confirm that GPS points are correctly buffered locally and written in batches to Firebase without infinite API recursion.
- **App Store Pre-check**: Verify Apple Login works seamlessly on iOS Simulators, displaying prompt dialogs and parsing credentials.

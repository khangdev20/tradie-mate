> Execution order: `06`  
> Parent phase: [Phase 3 — Flip & Accelerate (M19–M30)](../phase_3_flip_accelerate.md)  
> Previous: [📌 Module 3.5: Call-to-Job Automation (Twilio + LLM)](./05_module_3_5_call_to_job_automation_twilio_llm.md)

## 📌 Module 3.6: Nearby Supplies Finder
**Timeline**: Months 25–27
**Focus**: One-click lookup for Bunnings, Reece, or electrical supplies.

### Business Value & Adoption Evaluation

**User intention**: "I need a part now; where is the closest supplier that is open?"

**Why users will use it**:
*   It saves time during job execution, especially for urgent parts runs.
*   It can become a lightweight commerce/affiliate pathway later.

**Adoption risk**:
*   Generic map apps already solve part of this; TradieMate must be trade-aware to matter.
*   Incorrect opening hours or inventory assumptions damage trust.

**Retention mechanism**:
*   Useful during active jobs, especially when connected to job type, common parts, and route.

**Migration support**:
*   No migration needed; this is a convenience feature that deepens daily utility.

**Success metrics**:
*   Supplier searches per active job.
*   Directions launches.
*   Repeat usage by trade type.
*   Supplier result accuracy feedback.

**Build detail additions**:
*   Add preferred suppliers per tradie.
*   Cache nearby results by geohash and trade category.
*   Track query intent separately from map open.
*   Reuse Module 1.6 Mapbox map component, location permission state, camera bounds, marker rules, and directions launcher.

### 📱 Mobile UX & UI Specifications (React Native)

> **Design System Instruction**: Implement this UI using `TradieMate_Design_System.html` v1.0 tokens: light mode only, base `#FAFAF8`, elevated cards `#FFFFFF`, CTA `#2E6B45`, semantic success/warning/danger/info colors, Inter typography, 4px spacing scale, `8px` element radius, `12px` card radius, minimum `44px` touch targets, `0.5px` borders, no shadows, no gradients, and MaterialCommunityIcons with explicit size/color, preferring library icons over typed text symbols for actions and statuses. This supersedes any older orange CTA, thick-border, or hard-shadow wording in the detailed bullets below. Build this UI from shared primitives in `packages/ui` (`AppButton`, `IconButton`, `AppCard`, `StatusBadge`, `EmptyState`, `FormField`, `Stepper`, `SwipeConfirm`, `ModalShell`, `MapPanel`) before creating module-local components.

#### 📍 Merchant Map UX
*   **Custom Merchant Pins**:
    *   Show search results on the Mapbox widget using custom merchant brand icons (e.g. red for hardware, blue for plumbing).
    *   Merchant pins must be rendered through the shared `TradieMapView` marker API from Module 1.6, with trade/category color variants documented in the map foundation.
*   **Directions Launcher**:
    *   Tapping a merchant pin opens a drawer card showing distances and opening hours.
    *   Includes a prominent `Get Directions` button (`44px` minimum height) that opens the target coordinates directly in Apple Maps or Google Maps.
    *   If native map launch fails, fall back to the Module 1.6 route preview using Mapbox Directions.

---

### 🔌 API & Database Specification

#### 🛣️ Endpoints Details

##### 1. `GET /api/v1/supplies/search`
*   **Auth**: Bearer JWT.
*   **Query Parameters**:
    ```json
    {
      "latitude": "-27.456",
      "longitude": "153.034",
      "query": "plumbing"
    }
    ```
*   **Response (`200 OK`)**:
    ```json
    {
      "success": true,
      "data": {
        "merchants": [
          {
            "name": "Reece Plumbing Brisbane",
            "latitude": -27.458,
            "longitude": 153.035,
            "address": "12 Marshall St, Fortitude Valley QLD 4006",
            "distanceMeter": 230,
            "openNow": true
          }
        ]
      }
    }
    ```
*   **Workflow Evaluation**:
    *   **Pre-conditions**: JWT stored in `$TOKEN`.
    *   **Test Request**:
        ```bash
        curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/v1/supplies/search?latitude=-27.456&longitude=153.034&query=plumbing"
        ```
    *   **Expected Assertions**:
        *   **HTTP Status**: `200 OK`
        *   **Response**: Standardized envelope with `success: true` and merchant array inside `data`.

---

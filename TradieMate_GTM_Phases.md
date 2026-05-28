# TradieMate — Go-to-Market Phase Breakdown
> Australian Market · SaaS · May 2026 · v1.0
> Outsourcing-funded product launch strategy

---

## Overview

TradieMate follows a **4-phase GTM strategy** spanning 30+ months. The model is unique: an outsourcing arm funds product development until the SaaS reaches self-sustaining MRR. Each phase has distinct objectives, resource splits, go-to-market activities, success metrics, and hard constraints that must not be violated.

| Phase | Name | Months | Focus |
|-------|------|--------|-------|
| **Phase 1** | Build & Seed | M1–M8 | Product MVP + first paying tradies |
| **Phase 2** | Transition & Grow | M9–M18 | Scale to breakeven, hire first dev |
| **Phase 3** | Flip & Accelerate | M19–M30 | Product-first, outsourcing wind-down |
| **Phase 4** | Pure Product | M31+ | Full SaaS mode, close outsourcing |

---

## Phase 1 — Build & Seed
**Timeline: Month 1 – Month 8**
**Objective: Ship MVP, onboard first 50 tradies, hit $2K MRR**

---

### Context & Mindset

This phase is the most critical and most dangerous. The biggest failure mode is building features instead of talking to tradies. The outsourcing arm carries 100% of revenue. Every decision must pass the **4-question decision engine** before a line of code is written:

1. Did 3+ different tradies request this?
2. Does it increase invoice rate or reduce churn?
3. Can I ship MVP version in 3 days?
4. Am I building this because a tradie needs it — not because I think it's cool?

If any answer is NO → skip it.

---

### Product Build Instructions

**Week 1–2: Dashboard + Job Detail (MVP Core)**

Ship these two screens first — they are the daily driver for every tradie.

- Dashboard: greeting, 3-stat row (jobs today / pending / est. revenue), next job card (large), later jobs (faded), FAB row (+ New Job, Scan Invoice, Offline Mode)
- Job Detail: map snippet with ETA, slide-to-start commute button, call/SMS one-tap buttons, job notes + photo attachments
- Offline sync indicator must be visible on dashboard at all times (sage dot = online, amber dot = offline)
- Minimum touch target: 44px — tradies wear gloves

**Week 3: Invoice + Stripe Tap to Pay**

- Parts & labour line items with + / − controls
- GST 10% auto-calculated (store as integer cents only — never float)
- Digital signature pad (customer signs on tradie's phone)
- Stripe Tap to Pay integration — 1.7% AU card rate, no hardware needed
- Invoice auto-sequences per tradie: INV-0001, INV-0002 … (SELECT FOR UPDATE transaction — never skip a number)

**Week 4: Phone OTP Auth**

- Supabase Auth → Twilio OTP (built-in integration)
- Rate limit: 3 OTPs per phone number per 10 minutes (Redis)
- MMKV encrypted storage for tokens — never AsyncStorage
- Silent token refresh 5 minutes before expiry via AppState listener
- ABN field on registration — Luhn-validate before ATO API call, cache result 24h

**Month 2: Notifications + Beta Stability**

- Push notifications: job assigned (with quick Accept/View actions), payment received, doc expiring
- Offline mode: WatermelonDB SQLite — full job list, invoice creation, photo queue, customer signature capture available without signal
- Sync indicator always visible — tradies work underground, in thick-wall buildings, rural areas
- Bug bash with 5 Brisbane beta tradies — fix every blocking issue before public waitlist

---

### Go-to-Market Instructions (Month 1 — $65 Total Budget)

**Week 1–2: Build Awareness for Zero Dollar**

- Bunnings car park, 6:30 AM. Target tradies loading utes. Introduce yourself as building an app for tradies. Do NOT pitch — ask questions. "What's the most annoying part of your admin?" Collect phone numbers. Goal: 5 conversations per visit.
- Reece Plumbing counter during trade hours. Same approach — tradespeople waiting for orders are receptive. Focus on plumbers first (most underserved by existing tools).
- Facebook Groups: Join "Tradies AU", "Brisbane Plumbers", "Queensland Electricians". Do NOT post promotional content. Post genuinely helpful content: "GST tips for sole traders", "How to handle a customer who won't pay". Build credibility for 2 weeks before mentioning the app.
- WhatsApp follow-up: Every phone number collected gets a personal WhatsApp message within 24 hours. Not a pitch — a follow-up to the conversation you had. "Hey it was great chatting this morning — I'm building something based on exactly what you described. Can I send you a short video when it's ready?"

**Week 3–4: First Demo Bookings**

- DM the most engaged commenters in Facebook groups — offer a 15-minute video call to show them the beta
- TikTok account: Post 1 video per day. Content ideas: "Day in the life of a Brisbane plumber (and how much admin they do)", "The GST calculator trick most tradies don't know", "I built an app — here's why I started at Bunnings at 6:30am"
- Landing page: Deploy via Bolt.new to Vercel. Domain: tradieapp.com.au ($15). Single CTA: "Join the waitlist". Collect name + phone + trade type.
- Do NOT run Google Ads yet. Do NOT do cold email. Do NOT contact press.

**Week 4: Case Study Boost ($50)**

- If you have 1 tradie using the app and they are happy — record a 90-second video testimonial on your phone
- Boost that video to Brisbane tradies on Facebook: $50 budget, 7-day run
- Targeting: Job title includes Plumber, Electrician, Carpenter, Painter; Location: Greater Brisbane; Age: 25–55

**Month 2–8: Community-Led Growth**

- Target: 15 conversations per week (offline + online combined)
- Target: 3 product demos booked per week
- Every paying tradie gets a personal onboarding call (30 minutes on Zoom or phone)
- Feature requests from paying tradies go into Notion. Review weekly. Build only what 3+ tradies requested.
- NPS survey at Day 14 and Day 45 of each tradie's lifecycle

---

### Pricing in Phase 1

- Free tier: 10 jobs/month, basic invoice (no Xero, no tracking)
- Pro tier: $39/month — unlimited jobs, Xero sync, customer tracking
- Do NOT offer Group tier yet — no multi-tradie infrastructure built
- All payments via Stripe. No invoiced billing. Monthly only (no annual yet).

---

### Resource Allocation

| Resource | Split |
|----------|-------|
| Founder time | 70% outsourcing / 30% TradieMate |
| Cash budget | Outsourcing revenue funds everything |
| Dev time | Mon/Tue/Wed mornings = TradieMate only (hard calendar block) |
| Marketing budget | $65 total Month 1. $0 paid ads Month 2–7. |

---

### Phase 1 Constraints (NEVER violate)

- **WALL:** TradieMate development never touches client work. Client budget never funds TradieMate. Zero cross-contamination.
- **NO FEATURE CREEP:** Kill any feature with < 30% usage after 2 weeks. No exceptions. No sentiment.
- **NO SCALING OUTSOURCING:** Outsourcing arm stays at maximum 2 developers. Never hire a 3rd.
- **GST IS LAW:** Never ship an invoice screen without auto-calculated 10% GST. Legal liability exists.
- **ABN REQUIRED:** No tradie can receive jobs without verified ABN. Non-negotiable under Australian law.
- **DATA SOVEREIGNTY:** All data must stay in Supabase `ap-southeast-2` (Sydney). Privacy Act 1988.
- **NO EXPO:** React Native CLI only. Stripe Tap to Pay entitlement requires native build.
- **NO ASYNCSTORAGE:** Auth tokens in MMKV encrypted only.
- **NO FLOAT MONEY:** All monetary values stored as integer cents. $158.40 = `15840`.
- **TWILIO SENDER ID:** Register alphanumeric sender ID before 1 July 2026 (ACMA regulatory deadline). This window cannot be missed.

---

### Phase 1 Success Metrics

| Metric | Target |
|--------|--------|
| Waitlist signups | 50 by Day 30 |
| Beta tradies (active users) | 5 by Day 30 |
| Paying tradies | 1 by Day 18 / 3 by Day 30 |
| MRR at end of Phase 1 | $2,000–$3,000 |
| NPS score (paying users) | ≥ 40 |
| Demo → paying conversion | ≥ 30% |
| Feature usage (invoice screen) | ≥ 70% of active users |

---

### Phase 1 Exit Criteria

Phase 1 ends when **all three** conditions are met:
1. Dashboard, Job Detail, Invoice, Notifications screens are stable (< 1 crash per 100 sessions)
2. At least 3 paying tradies on Pro plan
3. At least 1 tradie has used the app daily for 30 consecutive days

---

## Phase 2 — Transition & Grow
**Timeline: Month 9 – Month 18**
**Objective: Reach 350 paying tradies, hit $13,650 MRR, approach breakeven at M14**

---

### Context & Mindset

Phase 2 is when the product proves it can grow without the founder doing every demo personally. The outsourcing arm shifts from 70/30 to 40/60 focus. The first external developer is hired at Month 12–14. The danger in this phase is premature scaling — burning money on paid acquisition before product-market fit is confirmed.

**Product-market fit signal to confirm before paid acquisition:**
- 40% of tradies say they would be "very disappointed" if TradieMate disappeared (Sean Ellis test)
- Monthly churn below 5%
- At least 3 tradies have referred another tradie unprompted

Do not run paid ads until these three conditions are met.

---

### Product Build Instructions

**Month 9–10: Customer Live Tracking (V1)**

This feature is the primary differentiator. No competitor (ServiceM8, Tradify, Fergus) has Uber-style live tracking. Build it right.

- Firestore collection: `tracking/{job_id}` — contains tradie position, ETA, vehicle plate, tradie name, avatar, rating, destination coordinates
- GPS updates from tradie phone via `react-native-background-geolocation` — maximum 1 location write to Firestore per GPS batch (batch = up to 20 raw points, write only latest)
- Customer receives SMS with unique public tracking URL: `/track/:token` — no auth required
- Customer tracking screen: map occupies 55% of screen, ETA badge large (top right), tradie profile card (name + avatar + rating + verified badges + plate number), Call Tradie button (green), Cancel Booking button (red/muted)
- "Slide to Start Commute" triggers: create TrackingSession in Postgres, write Firestore doc, send Twilio SMS to customer with tracking link
- "Mark Arrived" triggers: update job status to IN_PROGRESS, update Firestore ETA to "0 mins", send push notification to customer
- Job completion triggers: auto-create DRAFT invoice, close TrackingSession, delete Firestore tracking doc

**Month 10–11: Tradie Onboarding & Licence Verification (V1)**

Australian legal compliance. Unverified tradies cannot receive jobs.

- 5-step progress stepper (not dismissible)
- Step 1: ABN entry + verification (Luhn → ATO API → cached 24h)
- Step 2: Trade licence upload (photo or PDF). Per-state validation: NSW Fair Trading, VicRoads, QBCC (QLD), Consumer and Business Services (SA), etc.
- Step 3: Public Liability Insurance — minimum $5M coverage. Extract expiry date via OCR (AWS Textract or Google Document AI).
- Step 4: White Card (WHS General Induction) — mandatory for construction sites
- Step 5: Police Check — optional, but displayed on profile if uploaded
- Each document: status = Verified (sage) / Pending (amber) / Expired (red)
- 60-day expiry warning banner (amber). 0-day expiry banner (red). Red = job assignment blocked.
- Auto-reminder notifications: 60 days before, 30 days before, 7 days before expiry

**Month 11–12: Document Management Screen (V1)**

- Full document list with icon, issuing authority, expiry date, status badge
- Tap to expand: full document preview + re-upload option
- Warning system: aggregated banner if any document is in Expired or Expiring Soon state
- Expired document blocks job assignment at API layer (not just UI) — enforce via middleware

**Month 12–13: Offline Mode (Full V1)**

- WatermelonDB SQLite: full jobs list, invoice drafts, parts library
- Photo capture queues to AWS S3 (upload on reconnect)
- Customer signature captures locally, syncs on reconnect
- offline_queue Firestore collection for any actions taken offline
- Sync status always visible in header: Online (sage dot) / Syncing (pulsing) / Offline (amber dot)
- `@react-native-community/netinfo` for network state detection

**Month 13–14: Google + Apple SSO (V1.5 Auth)**

- Apple Sign In is MANDATORY — App Store will reject the app if any SSO exists without Apple (App Store Review Guideline 4.8)
- Apple: `appleAuth.performRequest` → `supabase.auth.signInWithIdToken` — email and full name are only returned on FIRST login, must store immediately in database
- Google: `@invertase/react-native-google-signin` → `signInWithIdToken` — handle `SIGN_IN_CANCELLED` silently (no error shown to user)
- `tradie_auth_methods` table tracks all linked providers per tradie
- Cannot unlink last auth method (validation at API layer)

**Month 14–15: Public Profile + Edit Profile (V1.5)**

- Public Profile (customer-facing): avatar, name, trade specialty chips, rating + review count, availability pill (Available Now in sage / Busy until 2PM in amber), stats (jobs done, avg response time, member since), credentials list with verified badges, service area map with radius circle, Book CTA (rust/green), Message button
- Edit Profile (tradie-facing): avatar change with camera overlay, name / ABN / phone (+61) / bio (150 char limit), trade specialties multi-select chips, hourly rate slider ($85–$150/hr) with public toggle, service area radius slider (5km–50km), availability toggles (Emergency callouts / Weekend / After hours)

**Month 15–16: Reviews & Ratings (V1.5)**

- Reviews only auto-triggered after job completion + payment confirmed — no manual review creation
- Rating hero: large number (e.g. 4.4) + 5-star visual + total count
- Breakdown bar chart: 5★ through 1★ with percentage per tier
- Filter chips: All, 5 Star, Recent, With Photos
- Review cards: avatar + name + date + stars + text + job type tag
- Tradie reply section with left border accent (collapsible)
- Reviews are immutable once submitted by customer — no editing

---

### Go-to-Market Instructions

**Month 9–11: Referral Programme Launch**

- Every paying tradie gets a personal referral link (unique code)
- Referrer earns: 1 free month Pro for each successful referral
- Referee earns: first month 50% off
- Track in database — no third-party referral tool needed at this scale
- Promote in monthly email and in-app notification to all Pro users

**Month 11–13: Trade Association Partnerships**

- Target: Master Plumbers Association QLD, NECA (National Electrical Contractors Association), HIA (Housing Industry Association)
- Offer: 3 months free Pro for all members + co-branded landing page
- In return: feature in their newsletter, mention at member events
- This channel can unlock 50–100 tradies per partnership at near-zero CAC

**Month 12–14: Content Marketing Acceleration**

- TikTok cadence: increase to 2 videos/week. Focus on before/after: "Before TradieMate: [messy invoicing]. After: [30 seconds, done]."
- YouTube: Start posting 5–10 minute videos. Topics: "How to set up Xero for tradies in Australia (2026)", "GST guide for sole trader tradies", "How to quote correctly as a plumber". These rank on search and build evergreen trust.
- Facebook Group engagement: By Month 12 you should be a recognised contributor. Announce TradieMate authentically when relevant.

**Month 13–15: First Paid Acquisition (If PMF Confirmed)**

Only activate if the 3 PMF conditions above are met.

- Google Ads: Target "tradie app australia", "job management app plumber", "invoice app electrician". Start with $500/month. Measure cost-per-trial (target < $30).
- Facebook Ads: Retarget website visitors who did not sign up. Lookalike audience from paying tradies. $300/month to start.
- Target CAC: $50–80 blended. If CAC exceeds $100 for 2 consecutive months → pause paid, return to organic.

**Month 14: Breakeven**

This is the projected breakeven month at 350 paying tradies ($13,650 MRR). Key actions at this milestone:

- Hire first external developer (part-time, 20 hrs/week minimum). Focus: Xero integration + Earnings Dashboard.
- Reduce outsourcing to 40% founder time
- Begin planning for Phase 3 flip

---

### Resource Allocation

| Resource | Split |
|----------|-------|
| Founder time | 40% outsourcing / 60% TradieMate |
| Dev | Founder + 1 contractor (from M12–14) |
| Marketing budget | $0–$800/month (paid activation only post-PMF) |

---

### Phase 2 Constraints (NEVER violate)

- **NO PAID ADS BEFORE PMF:** Do not spend on Google/Facebook ads until Ellis test ≥ 40%, churn < 5%, and 3 organic referrals confirmed.
- **NO GROUP TIER UNTIL V2:** Do not sell group/team plans until multi-tradie infrastructure is built and tested.
- **OUTSOURCING CAP:** Outsourcing arm stays at ≤ 5 developers, never grows.
- **APPLE SIGN IN MANDATORY:** Any SSO without Apple = App Store rejection. Build both simultaneously.
- **CUSTOMER TRACKING FIRESTORE-ONLY:** GPS position is live data only. PostgreSQL is source of truth. Never store historical ping trail in Firestore.
- **GPS BATCH LIMIT:** Max 20 GPS points per request. Max 1 Firestore write per batch. Client polls max every 5000ms. Exceeding these limits causes Firebase costs to spike.
- **XERO VIA BULLMQ ONLY:** Never `await` Xero sync inline in a request handler. Always queue via BullMQ + Redis. Xero API is slow and unreliable — blocking the request thread causes timeouts.
- **DOCUMENT EXPIRY ENFORCEMENT:** Expired licence/insurance must block job assignment at API middleware level — never rely on UI alone.
- **CHURN MONITORING:** If monthly churn exceeds 8% for 2 consecutive months — freeze new feature development, do 10 churn interviews in 7 days, identify root cause.

---

### Phase 2 Success Metrics

| Metric | Target |
|--------|--------|
| Paying tradies (end of phase) | 350 |
| MRR (end of phase) | $13,650 |
| Monthly churn | < 5% |
| CAC (paid channels) | < $80 |
| LTV:CAC ratio | > 8:1 |
| NPS | ≥ 50 |
| Active feature: Customer Tracking | ≥ 60% of Pro users use per job |
| Trade association partnerships | ≥ 2 signed |

---

### Phase 2 Exit Criteria

Phase 2 ends when **both** conditions are met:
1. MRR reaches $13,000+ (approaching breakeven)
2. Monthly churn is stable below 5% for 3 consecutive months

---

## Phase 3 — Flip & Accelerate
**Timeline: Month 19 – Month 30**
**Objective: Reach $20K+ MRR for 3 consecutive months, prepare outsourcing wind-down**

---

### Context & Mindset

Phase 3 is the transition from hybrid operator to pure product founder. Outsourcing drops to 15% of focus by Month 30. The product team grows. This phase introduces the highest-value features: Earnings Dashboard, Xero integration (full), multi-tradie/admin view, and the unique differentiators no competitor has — Call-to-Job Automation and Nearby Supplies Finder.

The **flip trigger** is irrevocable: when MRR exceeds $20K for 3 consecutive months → begin outsourcing wind-down process. No renegotiation. No extending the timeline. This rule exists to prevent the founder from staying comfortable in the outsourcing business.

---

### Product Build Instructions

**Month 19–21: Earnings Dashboard (V2)**

- Period tabs: This Week / This Month / This Year
- Hero card: total earned + % change vs previous period
- Stats grid 2×2: Jobs done / Avg job value / Hours worked / Pending payout
- Bar chart (7-day): bars in forest green/rust, dashed average line
- Transactions list: job name + customer + date + amount
- Payout section: next payout date + bank account last 4 digits + "Request Early Payout" button
- Xero sync status badge

**Month 19–22: Xero Integration (V2, Full)**

- OAuth 2.0 flow: tradie connects their Xero account via in-app browser
- Store Xero access token + refresh token in `xero_connections` table (per tradie, encrypted)
- Every completed invoice auto-queues a Xero sync job via BullMQ
- BullMQ job: create invoice in Xero, mark as approved, attach line items with GST
- Webhook: Stripe payment confirmed → BullMQ → mark Xero invoice as paid
- Sync status per invoice: Synced (sage) / Pending (amber) / Failed (red with retry button)
- Token refresh handled automatically — Xero tokens expire every 30 minutes
- Xero is the accounting standard for Australian small business — this feature is the #1 Pro tier retention driver

**Month 20–22: Group Plan + Multi-Tradie Admin View (V2)**

- Group plan: $99/month for 3–5 tradies
- Admin (typically business owner/sole director): sees all tradies' jobs, invoices, earnings in one view
- Admin can assign jobs to specific tradies
- Admin cannot access individual tradie bank account or personal data — data boundary enforced at API
- Sub-tradie accounts linked to admin ABN for compliance
- Stripe subscription handles Group billing — admin pays, sub-tradies get access tokens

**Month 22–24: Scheduling Module (V2)**

- Weekly calendar view: jobs as coloured blocks per day/time
- Drag-to-reschedule (with customer SMS notification on reschedule)
- Recurring job support: weekly lawn care, monthly HVAC maintenance
- Conflict detection: prevent overlapping job assignments
- Integration with Google Calendar (optional sync, not required)

**Month 23–25: Call-to-Job Automation (Unique Feature #1)**

This feature has zero equivalent in any competitor. It converts inbound phone calls into job records automatically.

Architecture:
1. Each tradie gets a dedicated Twilio number (forwarded from their real mobile)
2. Twilio intercepts all calls before forwarding to tradie's phone
3. Twilio Whisper transcribes the caller's message (first 60 seconds)
4. Transcript sent to Claude API: extract customer name, phone, job type, address, urgency
5. Structured job DRAFT created in database
6. FCM push to tradie: "New job from [name] — tap to confirm"
7. Tradie taps "Confirm" → job becomes UPCOMING, customer gets booking confirmation SMS
8. If tradie doesn't respond within 2 hours → follow-up ping

Cost per call: ~$0.02 Twilio + ~$0.001 Claude API = negligible
Build timeline: 4–6 weeks
Impact: Zero missed leads, even when tradie is on a roof or underground

**Month 25–27: Nearby Supplies Finder (Unique Feature #2)**

This feature has zero equivalent in any competitor and opens a sponsorship revenue stream.

- During active job: "Find Supplies" button in Job Detail screen
- Google Places API: search for Bunnings, Reece, Tradelink, Electrical warehouse within 10km of job site
- Show: distance, current open/closed status, directions
- In future: supplier-sponsored placement ("Reece — preferred supplier") → sponsorship revenue from Y2
- Simple to build: 1 API call, 1 screen. High perceived value for tradies.

---

### Go-to-Market Instructions

**Month 19–21: Group Plan Rollout**

- Identify existing Pro tradies who are sole operators of a small business (2–4 employees)
- Personal outreach (WhatsApp/phone): "Hey [name] — we've just launched team plans. Would it work for your crew?"
- Migration offer: current Pro tradie gets 50% off Group plan for first 3 months if they bring at least 2 additional tradies
- Target: 20 Group plan subscribers by Month 24

**Month 21–24: Partnership with Accounting Firms**

- Target: small accounting firms in QLD/NSW that specialise in trades businesses (search MYOB/Xero advisor directories)
- Offer: referral fee of $20/tradie per month for 12 months for each tradie referred by the firm
- Pitch: "Your tradie clients hate their invoicing software. TradieMate integrates with Xero and handles GST automatically. You'll spend less time cleaning up their books."
- Expected yield: 10–30 tradies per accounting firm partnership

**Month 22–25: App Store Optimisation (ASO)**

- App Store description: rewrite for keywords "tradie app australia", "job management plumber electrician", "invoice app GST"
- Screenshots: redesign to show Customer Tracking map + Invoice + Dashboard. Show numbers (4.4 stars, 1,200 jobs completed).
- A/B test app icon: hard hat vs tools vs app name wordmark
- Respond to every App Store review within 24 hours — this directly affects ranking

**Month 24–26: PR and Media Outreach**

By this point you have a real story: Australian founder, built at Bunnings car parks, 500+ tradies using the product. This is genuinely interesting.

- Targets: The Australian, AFR Young Rich, SmartCompany, Tradies in Business podcast
- Pitch angle: "I bootstrapped a SaaS for tradies in Australia. Here's what I learned spending 6am mornings at Bunnings."
- Secondary angle: "Australian tradies are being underserved by New Zealand and US software. Here's the local alternative."
- Do NOT hire a PR agency yet. Write and send the pitches yourself. Personal founder story resonates more.

---

### Resource Allocation

| Resource | Split |
|----------|-------|
| Founder time | 15% outsourcing / 85% TradieMate |
| Dev team | Founder + 2 full-time contractors |
| Marketing budget | $2,000–$5,000/month (paid + content + events) |

---

### Phase 3 Constraints (NEVER violate)

- **THE FLIP TRIGGER IS BINDING:** When MRR > $20K for 3 consecutive months — begin outsourcing wind-down. No exceptions. No renegotiation. No "just one more client."
- **OUTSOURCING SHRINKS ONLY:** Do not take new outsourcing clients after Month 24. Run down existing contracts only.
- **CAC DISCIPLINE:** If blended CAC exceeds $100 for 2 consecutive months — stop paid acquisition, audit conversion funnel, fix before resuming.
- **XERO ALWAYS QUEUED:** Xero sync is always via BullMQ. Never inline. Ever.
- **CALL AUTOMATION PRIVACY:** Call transcript data is never stored beyond 30 days. Privacy Act 1988 compliance. Inform tradies of call interception in ToS before activating the feature.
- **R&D TAX INCENTIVE:** Apply for the 43.5% R&D refund in the first tax return after incorporating Pty Ltd. Eligible R&D: the app tech itself constitutes innovation. Potential $15–50K annual refund — this is found money.
- **APPLE TAP TO PAY:** Apply for Apple Tap to Pay entitlement when MRR > $20K. Required for processing contactless card payments via iPhone on iOS 16+. Processing time: 2–4 weeks.

---

### Phase 3 Success Metrics

| Metric | Target |
|--------|--------|
| Paying tradies | 800–1,000 |
| MRR (trigger point) | $20,000+ sustained 3 months |
| Group plan subscribers | 20+ teams |
| ARR run rate | $240K+ |
| Monthly churn | < 4% |
| Call-to-Job automation activation | ≥ 30% of Pro tradies |
| Xero connection rate (Pro users) | ≥ 70% |
| App Store rating | ≥ 4.5 stars |

---

### Phase 3 Exit Criteria

Phase 3 ends when **all three** conditions are met:
1. MRR exceeds $20,000 for 3 consecutive months
2. Outsourcing arm has no new clients being onboarded
3. Full-time dev hired or in final interview stage

---

## Phase 4 — Pure Product
**Timeline: Month 31 onwards**
**Objective: Full SaaS mode, ARR $2.3M at Year 3, outsourcing fully closed**

---

### Context & Mindset

Phase 4 is the endgame of the original plan. The outsourcing business is closed. TradieMate is 100% of revenue and focus. By Year 3, the target is 5,000 paying tradies at blended ARPU of ~$46/month ($2.3M ARR).

The moats built in earlier phases become fully defensible here:

- **Verified tradie network:** ABN + licence verification took 2–3 years to build. Competitors cannot replicate overnight.
- **Behavioural data:** The job/invoice/location dataset is the most comprehensive index of Australian trades activity in existence. No competitor can buy this.
- **Call-to-Job automation:** No competitor has the Twilio + Claude API combo. Even if they copy it, TradieMate has months of training data advantage.
- **Customer tracking viral loop:** Every tracking link sent to every customer is a brand impression. At 5,000 tradies doing 5 jobs/week = 1.3M tracking link views/year. Zero paid acquisition required.

---

### Product Build Instructions

**Month 31–36: Multi-State Licence Verification Automation**

- Automate licence status checks via state APIs/scraping: NSW Fair Trading, QBCC (QLD), VBA (VIC), CBS (SA), EnergySafety (WA)
- Real-time licence status updates — not just document upload verification
- Notify tradie immediately if licence status changes in the registry
- This becomes a trust signal marketed to enterprise customers (property management groups, strata companies)

**Month 33–38: Enterprise / Property Management Tier**

- Target: property management companies (LJ Hooker, Ray White, Century 21) who send maintenance jobs to tradies
- New plan tier: $299/month for property managers — access to verified tradie network, job dispatch, tracking for tenants, invoice management
- This is a B2B2C model layered on top of the existing B2C tradie network
- Build: job request portal (web), tradie acceptance flow, tenant tracking page (rebrand of existing customer tracking screen)

**Month 36+: AI Voice Agent (Unique Feature #3)**

- Vapi.ai integration: AI voice agent answers tradie's phone when they are unavailable (underground, on roof, with customer)
- Agent collects: caller name, phone number, job description, urgency, preferred time
- Creates DRAFT job, sends FCM to tradie: "AI answered a call from [name] — tap to review"
- Zero missed leads, even during active jobs
- Tradie can set custom voice agent persona and greeting
- Cost: ~$0.05–$0.10 per minute of voice (Vapi.ai pricing)

**Month 38+: Scheduling Marketplace**

- Customers can book verified tradies directly via web portal (not just via tradie referral)
- TradieMate takes a booking fee: 3–5% of job value (separate from SaaS subscription)
- This transitions the business model from pure SaaS to marketplace+SaaS hybrid
- Requires significant trust infrastructure: customer reviews, dispute resolution, payment escrow

---

### Go-to-Market Instructions

**Month 31–36: Enterprise Sales**

- Hire first sales person (junior, $60K base + commission) focused on property management groups
- Build enterprise landing page and case study PDFs
- Attend REIQ (Real Estate Institute QLD) annual conference
- Pilot with 1 property management group (free for 3 months) → use as case study

**Month 33+: National Expansion**

- Until now: primary focus QLD (Brisbane, Gold Coast, Sunshine Coast) + Sydney
- Phase 4 expansion: Melbourne (VIC), Perth (WA), Adelaide (SA)
- State-specific licence verification must be built first for each new state
- Partner with state trade associations in each new market before launch
- Localise marketing: use state-specific language (e.g. WA tradies call it a "quote" not an "estimate")

**Month 36+: Supplier Sponsorship Revenue**

- Activate Nearby Supplies Finder sponsorships
- Pitch to Bunnings Trade, Reece Plumbing, Rexel Electrical, Haymes Paint
- Offer: featured placement in supplies finder when tradie is within 5km of their store
- Pricing model: $5 CPM (cost per 1,000 impressions) or flat monthly sponsorship
- At 5,000 tradies × 5 jobs/week × 52 weeks = 1.3M supply searches/year → significant sponsorship inventory

---

### Resource Allocation

| Resource | Split |
|----------|-------|
| Outsourcing | Closed |
| Founder time | 100% TradieMate |
| Dev team | 3–5 full-time |
| Marketing budget | $10,000–$20,000/month |
| Sales | 1 enterprise sales rep |

---

### Phase 4 Constraints (NEVER violate)

- **OUTSOURCING IS CLOSED:** No reopening. No "just one quick client project." The decision is final.
- **MARKETPLACE ESCROW:** When booking fees are introduced, payment must be held in escrow until job is marked complete by customer — never release on tradie's unilateral action.
- **ENTERPRISE DATA ISOLATION:** Property manager clients must never see individual tradie's personal earnings, bank details, or private job notes. Strict API layer data boundary.
- **VERIFIED-ONLY MARKETPLACE:** When the marketplace opens, only tradies with fully verified documents (licence + insurance + White Card) can appear in search results. No exceptions.
- **VAPI DISCLOSURE:** Tradies must disclose in their booking flow when using the AI voice agent — caller must know they are speaking to an AI. ACMA/ACCC compliance.

---

### Phase 4 Success Metrics

| Metric | Year 3 Target |
|--------|--------------|
| Paying tradies | 5,000 |
| ARR | $2.3M |
| Blended ARPU | ~$46/month |
| Monthly churn | < 3% |
| LTV | $780+ |
| CAC | $50–80 blended |
| LTV:CAC | > 9:1 |
| Enterprise customers (property managers) | 20+ |
| Supplier sponsorship revenue | $50K+ annual |

---

## Summary — Phase Trigger Matrix

| Trigger | Action |
|---------|--------|
| Day 18 | First paying tradie → validate product is shippable |
| Month 2 end | 3 paying tradies on Pro → Phase 1 on track |
| Month 8 end | 50 paying tradies, < 5% churn → validated PMF, proceed to Phase 2 |
| Month 12–13 | 3 organic referrals confirmed + Ellis test ≥ 40% → activate paid acquisition |
| Month 14 | Breakeven (350 tradies) → hire first external developer |
| Month 18 end | Stable churn < 5% for 3 months → Phase 2 complete, begin Phase 3 prep |
| **$20K MRR × 3 months** | **→ BEGIN OUTSOURCING WIND-DOWN (irrevocable)** |
| Month 30 | Outsourcing fully closed → Phase 4 begins |
| Year 3 | 5,000 tradies, $2.3M ARR → explore Series A or profitable independence |

---

## Non-Negotiable Rules Across All Phases

These constraints apply for the entire life of the product. No phase, metric, or pressure overrides them.

1. **GST is always auto-calculated.** No invoice ships without it.
2. **ABN is always verified.** No tradie receives a job without it.
3. **Money is always stored as integer cents.** Never float.
4. **Timezone is always UTC in database, Australia/Sydney in display.** Never mix.
5. **Every query filters by tradie_id.** No cross-tradie data leakage. Ever.
6. **Xero sync is always queued via BullMQ.** Never inline.
7. **Firebase is real-time only.** PostgreSQL is source of truth.
8. **Drizzle queries are always parameterised.** Never raw SQL with user input.
9. **All data stays in ap-southeast-2 (Sydney).** Privacy Act 1988.
10. **The outsourcing arm only shrinks.** Never grows beyond 5 developers.

---

*TradieMate GTM Phase Document · May 2026 · v1.0*
*Compiled from: Product Specification + Master Context File*

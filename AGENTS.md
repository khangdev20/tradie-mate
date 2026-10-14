# AGENTS.md

## Cursor Cloud specific instructions

This repo is a two-project workspace (see `README.md`):

- `tradie-mate-api` — Fastify v5 + TypeScript backend (the runnable product in this Linux cloud environment). Scripts in `tradie-mate-api/package.json`: `dev`, `build`, `start`, `test` (vitest), `type-check`, `db:migrate`, `db:seed`, `queue:worker`. There is no `lint` script; use `npm run type-check`.
- `tradie-mate-app` — React Native 0.85 mobile app. It cannot be run on a device/simulator in this Linux VM (no iOS/Android emulator); only `npm install`, `npm run lint`, `npm test` (jest), `npm run type-check`, and the Metro bundler (`npm start`) are usable here.

### CRITICAL: never let `psql` open its pager
The agent shell runs commands under a PTY, so interactive `psql` (e.g. `psql -c "select ..."`) can launch the `less` pager and **permanently wedge the shell session** (no further commands return). Always disable the pager when using `psql`:

- Prefer: `psql -P pager=off ...` or add `-At` for script-friendly output, or
- Export once: `export PAGER=cat` (and/or `PSQL_PAGER=cat`).

If the shell ever stops returning output, this pager wedge is the most likely cause.

### Required local services (not started by the update script)
The API needs a local **PostgreSQL** and **Redis** running before it will work end to end. Start them with:

- PostgreSQL 16: `sudo pg_ctlcluster 16 main start`
- Redis: `sudo redis-server /etc/redis/redis.conf --daemonize yes`

The dev DB role/db used by `.env` is `tradiemate`/`tradiemate` on `127.0.0.1:5432` (database `tradiemate`).

### Environment variables (`tradie-mate-api/.env`)
`src/config/env.ts` does strict Zod validation at startup and the process **exits** if any required var is missing/mal-formatted, even for features you are not testing. A working dev `.env` (gitignored) is kept on the VM. Non-obvious format rules:

- `JWT_SECRET` must be >= 32 chars; `STRIPE_SECRET_KEY` must start with `sk_`; `STRIPE_WEBHOOK_SECRET` with `whsec_`; `TWILIO_FROM_NUMBER` with `+61`.
- `DIRECT_DATABASE_URL` is **required** by `env.ts` and `drizzle.config.ts` but is missing from `.env.example` — set it to the same value as `DATABASE_URL` locally.
- `FIREBASE_PRIVATE_KEY` must be a **real, parseable** PEM RSA key (firebase-admin parses it at boot). A throwaway key from `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048` works; store it with literal `\n` escapes inside double quotes.

### Running and migrating
From `tradie-mate-api`: `npm run db:migrate` then `npm run db:seed`, then `npm run dev` (listens on `:3000`, Swagger UI at `/docs`, health at `/health`). The BullMQ background worker is a separate process: `npm run queue:worker`. On start it registers two repeatable jobs: `licence-schedule` (02:00 Australia/Brisbane — document expiry reminders + licence registry re-checks) and `webhook-replay` (every 5 min — retries Twilio/Vapi calls saved to `raw_webhooks` when processing failed).

Server-side pushes go through `NotificationService.notifyTradie` (stores a `notifications` row, then FCM to all `fcm_tokens`); it never throws, so a push failure cannot fail the action that triggered it.

The seed creates a default test tradie "Dave Plumber" (`test@tradiemate.com`, authUserId `00000000-0000-0000-0000-000000000000`) plus a demo customer, jobs, and invoices. It degrades gracefully when Supabase Auth is unreachable (falls back to that mock auth user id).

### Authenticating to protected endpoints in dev
Route auth (`src/middleware/auth.middleware.ts`) verifies the bearer token via `supabaseAdmin.auth.getUser(token)`, i.e. it calls `${SUPABASE_URL}/auth/v1/user`. With placeholder Supabase creds this fails, so to exercise authenticated endpoints locally point `SUPABASE_URL` at a tiny local stub that returns the seeded user JSON (id `00000000-0000-0000-0000-000000000000`) for `/auth/v1/user`, then send any `Authorization: Bearer <token>`. (Note: the *other*, currently-unused middleware at `src/middleware/requireAuth.ts` instead supports a `mock-token...` bearer in development.)

### Entitlement `Date` bug (fixed)
`src/services/entitlement.service.ts` used to interpolate a JS `Date` into a raw `sql` fragment, which 500'd `POST /jobs` and invoice creation. It now uses drizzle's typed `gt(column, now)`; avoid raw `sql\`... ${date}\`` with `Date` values elsewhere.

### Mobile app (`tradie-mate-app`) known states
- `npm run type-check`, `npm test -- --runInBand` (jest) and `npm run lint` all pass; lint reports warnings only (inline styles, bitwise/`no-void`). CI fails on any lint **error**, so keep it at 0 errors.

### Migration metadata
`drizzle/meta/_journal.json` was malformed (missing `},` between entries) which silently broke `npm run db:migrate`; this has been fixed in the repo.

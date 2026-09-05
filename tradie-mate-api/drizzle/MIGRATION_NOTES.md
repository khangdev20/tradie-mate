# Migration upgrade ordering

`meta/_journal.json` entries must have monotonically increasing `when`
timestamps, because the installed Drizzle migrator uses the last applied
timestamp to decide which migrations to run next.

The onboarding migrations `0004_legal_consent` and `0005_onboarding_state` were
originally written with `when` timestamps older than
`0003_remarkable_lila_cheney`, which could cause an existing database already
migrated through `0003` to skip the consent/onboarding migrations.

Repair applied:

- `0004_legal_consent.when` -> `1788700000000`
- `0005_onboarding_state.when` -> `1788800000000`

Both are now greater than `0003_remarkable_lila_cheney.when`
(`1788615233682`) and increasing.

## Operator validation

Against a disposable Postgres database only (never production):

```bash
cd tradie-mate-api
DIRECT_DATABASE_URL='postgresql://...' DATABASE_URL='postgresql://...' npm run db:migrate
```

Verify the consent and onboarding schema exists:

```sql
select column_name from information_schema.columns
where table_name = 'tradies'
  and column_name in ('terms_accepted_at', 'onboarding_status');
```

Repeat `npm run db:migrate` to confirm it is idempotent (no duplicate-column
or duplicate-type failures).

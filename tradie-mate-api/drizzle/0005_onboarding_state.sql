-- P0 Tradie Registration: Add onboarding state machine columns to tradies
-- and create onboarding_events audit table.

-- 1. Add new columns to tradies
ALTER TABLE tradies
  ADD COLUMN IF NOT EXISTS business_name            text,
  ADD COLUMN IF NOT EXISTS onboarding_status        varchar(40) NOT NULL DEFAULT 'PHONE_PENDING',
  ADD COLUMN IF NOT EXISTS abn_verification_status  varchar(40) NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS has_public_liability_declared boolean,
  ADD COLUMN IF NOT EXISTS experience_years         varchar(20),
  ADD COLUMN IF NOT EXISTS beta_approved_at         timestamptz;

-- 2. Create onboarding_events audit table
CREATE TABLE IF NOT EXISTS onboarding_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tradie_id  uuid NOT NULL REFERENCES tradies(id) ON DELETE CASCADE,
  step       varchar(50) NOT NULL,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_events_tradie_idx ON onboarding_events(tradie_id);
CREATE INDEX IF NOT EXISTS onboarding_events_step_idx   ON onboarding_events(step);

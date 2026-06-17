-- Phase implementation completion migration
ALTER TABLE tradies ADD COLUMN IF NOT EXISTS public_profile_slug varchar(80) UNIQUE;
ALTER TABLE tradies ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE tradies ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
ALTER TABLE trade_documents ADD COLUMN IF NOT EXISTS ocr_payload text;

CREATE TABLE IF NOT EXISTS raw_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(40) NOT NULL,
  event_id varchar(255),
  signature text,
  payload jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts varchar(10) NOT NULL DEFAULT '0',
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS raw_webhooks_status_idx ON raw_webhooks (status, created_at);
CREATE INDEX IF NOT EXISTS raw_webhooks_provider_event_idx ON raw_webhooks (provider, event_id);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tradie_id uuid,
  session_id varchar(64),
  event_name varchar(120) NOT NULL,
  properties jsonb,
  platform varchar(20),
  app_version varchar(20),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (event_name, created_at);
CREATE INDEX IF NOT EXISTS analytics_events_tradie_idx ON analytics_events (tradie_id, created_at);

CREATE TABLE IF NOT EXISTS voice_agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tradie_id uuid NOT NULL UNIQUE,
  vapi_assistant_id text,
  business_hours jsonb,
  call_script text,
  disclosure_text text,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

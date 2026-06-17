CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "tradie_id" uuid NOT NULL,
  "event_type" varchar(80) NOT NULL,
  "source" varchar(40) NOT NULL,
  "stripe_payment_intent_id" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fcm_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tradie_id" uuid NOT NULL,
  "token" text NOT NULL,
  "platform" varchar(20),
  "device_id" varchar(120),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fcm_tokens_tradie_token_unique" UNIQUE("tradie_id","token")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "signature_url" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_events_invoice_idx" ON "payment_events" USING btree ("invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_events_tradie_created_idx" ON "payment_events" USING btree ("tradie_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fcm_tokens_tradie_idx" ON "fcm_tokens" USING btree ("tradie_id");

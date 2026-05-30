CREATE TYPE "public"."billing_interval" AS ENUM('MONTH', 'YEAR');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');--> statement-breakpoint
CREATE TABLE "tradie_auth_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "tradie_provider_unique" UNIQUE("tradie_id","provider")
);
--> statement-breakpoint
CREATE TABLE "invoice_sequence" (
	"tradie_id" uuid PRIMARY KEY NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geocoded_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_address" text NOT NULL,
	"formatted_address" text NOT NULL,
	"latitude_micro" integer NOT NULL,
	"longitude_micro" integer NOT NULL,
	"confidence" integer NOT NULL,
	"provider" varchar(50) DEFAULT 'MAPBOX' NOT NULL,
	"provider_place_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid,
	"event_type" varchar(80) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin_geohash" varchar(20) NOT NULL,
	"destination_geohash" varchar(20) NOT NULL,
	"profile" varchar(40) DEFAULT 'driving-traffic' NOT NULL,
	"distance_meters" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"traffic_duration_seconds" integer,
	"polyline" text NOT NULL,
	"provider_payload" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlement_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"entitlements" jsonb NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(80) NOT NULL,
	"entitlements" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"billing_interval" "billing_interval" DEFAULT 'MONTH' NOT NULL,
	"stripe_price_id" varchar(255) NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tradie_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"plan_code" varchar(80) NOT NULL,
	"status" "subscription_status" DEFAULT 'TRIALING' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"key" varchar(120) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_counters_unique_idx" UNIQUE("tradie_id","key","period_start","period_end")
);
--> statement-breakpoint
ALTER TABLE "tradies" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "has_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "apple_id" text;--> statement-breakpoint
ALTER TABLE "tradie_auth_methods" ADD CONSTRAINT "tradie_auth_methods_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_sequence" ADD CONSTRAINT "invoice_sequence_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_events" ADD CONSTRAINT "location_events_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_events" ADD CONSTRAINT "location_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_code_subscription_plans_code_fk" FOREIGN KEY ("plan_code") REFERENCES "public"."subscription_plans"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tradie_subscriptions" ADD CONSTRAINT "tradie_subscriptions_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_methods_tradie_idx" ON "tradie_auth_methods" USING btree ("tradie_id");--> statement-breakpoint
CREATE INDEX "auth_methods_provider_idx" ON "tradie_auth_methods" USING btree ("provider","provider_id");--> statement-breakpoint
ALTER TABLE "tradies" ADD CONSTRAINT "tradies_google_id_unique" UNIQUE("google_id");--> statement-breakpoint
ALTER TABLE "tradies" ADD CONSTRAINT "tradies_apple_id_unique" UNIQUE("apple_id");
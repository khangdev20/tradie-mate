CREATE TYPE "public"."invite_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'COMPLETED', 'DISPUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."enterprise_job_status" AS ENUM('DISPATCHED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."licence_check_status" AS ENUM('QUEUED', 'IN_PROGRESS', 'VERIFIED', 'EXPIRED', 'NOT_FOUND', 'ERROR');--> statement-breakpoint
CREATE TABLE "group_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"status" "invite_status" DEFAULT 'PENDING' NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tradie_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"tradie_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_member_unique" UNIQUE("group_id","tradie_id")
);
--> statement-breakpoint
CREATE TABLE "tradie_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stripe_subscription_id" varchar(255),
	"max_members" text DEFAULT '5' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"tradie_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"platform_fee_cents" integer NOT NULL,
	"net_payout_cents" integer NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"status" "escrow_status" DEFAULT 'HELD' NOT NULL,
	"held_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"customer_email" varchar(255),
	"description" text NOT NULL,
	"address" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"quoted_amount_cents" integer,
	"booking_fee_cents" integer,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"dispute_reason" text,
	"disputed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" varchar(20),
	"contact_email" varchar(255) NOT NULL,
	"api_key" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_monthly_jobs" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enterprise_clients_contact_email_unique" UNIQUE("contact_email"),
	CONSTRAINT "enterprise_clients_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "enterprise_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid,
	"property_ref" varchar(100) NOT NULL,
	"property_address" text NOT NULL,
	"issue_type" text NOT NULL,
	"priority" varchar(20) DEFAULT 'NORMAL' NOT NULL,
	"status" "enterprise_job_status" DEFAULT 'DISPATCHED' NOT NULL,
	"dispatched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"client_ref" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licence_automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"doc_type" "document_type" NOT NULL,
	"state" varchar(3) NOT NULL,
	"status" "licence_check_status" DEFAULT 'QUEUED' NOT NULL,
	"raw_payload" jsonb,
	"error_msg" text,
	"checked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid,
	"session_id" varchar(64),
	"event_name" varchar(120) NOT NULL,
	"properties" jsonb,
	"platform" varchar(20),
	"app_version" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"event_id" varchar(255),
	"signature" text,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" varchar(10) DEFAULT '0' NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_agent_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"vapi_assistant_id" text,
	"business_hours" jsonb,
	"call_script" text,
	"disclosure_text" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_agent_configs_tradie_id_unique" UNIQUE("tradie_id")
);
--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "public_profile_slug" varchar(80);--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "public_profile_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "stripe_connect_account_id" text;--> statement-breakpoint
ALTER TABLE "trade_documents" ADD COLUMN "ocr_payload" text;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_group_id_tradie_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tradie_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_invited_by_tradies_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tradie_group_members" ADD CONSTRAINT "tradie_group_members_group_id_tradie_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tradie_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tradie_group_members" ADD CONSTRAINT "tradie_group_members_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tradie_groups" ADD CONSTRAINT "tradie_groups_owner_id_tradies_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_booking_id_marketplace_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."marketplace_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_bookings" ADD CONSTRAINT "marketplace_bookings_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_bookings" ADD CONSTRAINT "marketplace_bookings_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_jobs" ADD CONSTRAINT "enterprise_jobs_client_id_enterprise_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."enterprise_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_jobs" ADD CONSTRAINT "enterprise_jobs_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_jobs" ADD CONSTRAINT "enterprise_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licence_automation_runs" ADD CONSTRAINT "licence_automation_runs_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_group_idx" ON "group_invitations" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "invites_token_idx" ON "group_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "tradie_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_members_tradie_idx" ON "tradie_group_members" USING btree ("tradie_id");--> statement-breakpoint
CREATE INDEX "groups_owner_idx" ON "tradie_groups" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "escrow_booking_idx" ON "escrow_payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "escrow_tradie_status_idx" ON "escrow_payments" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "bookings_tradie_status_idx" ON "marketplace_bookings" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "enterprise_email_idx" ON "enterprise_clients" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "enterprise_apikey_idx" ON "enterprise_clients" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX "enterprise_jobs_tradie_idx" ON "enterprise_jobs" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "enterprise_jobs_client_idx" ON "enterprise_jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "licence_runs_tradie_idx" ON "licence_automation_runs" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "licence_runs_queued_idx" ON "licence_automation_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_name_idx" ON "analytics_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_tradie_idx" ON "analytics_events" USING btree ("tradie_id","created_at");--> statement-breakpoint
CREATE INDEX "raw_webhooks_status_idx" ON "raw_webhooks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "raw_webhooks_provider_event_idx" ON "raw_webhooks" USING btree ("provider","event_id");--> statement-breakpoint
ALTER TABLE "tradies" ADD CONSTRAINT "tradies_public_profile_slug_unique" UNIQUE("public_profile_slug");
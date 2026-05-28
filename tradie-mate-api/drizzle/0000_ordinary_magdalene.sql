CREATE TYPE "public"."document_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'EXPIRING_SOON', 'EXPIRED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('TRADE_LICENCE', 'PUBLIC_LIABILITY_INSURANCE', 'WHITE_CARD', 'POLICE_CHECK', 'WORKERS_COMPENSATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."job_source" AS ENUM('MANUAL', 'PHONE_CALL', 'CUSTOMER_BOOKING', 'REFERRAL');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('DRAFT', 'UPCOMING', 'COMMUTING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('JOB_ASSIGNED', 'JOB_REMINDER', 'PAYMENT_RECEIVED', 'NEW_REVIEW', 'DOC_EXPIRING', 'DOC_EXPIRED', 'OFFLINE_SYNC_COMPLETE', 'CALL_JOB_CREATED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('STRIPE_TAP_TO_PAY', 'STRIPE_CARD', 'CASH', 'BANK_TRANSFER', 'SQUARE');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'HVAC', 'PAINTER', 'TILER', 'ROOFER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."urgency_level" AS ENUM('EMERGENCY', 'TODAY', 'THIS_WEEK', 'FLEXIBLE');--> statement-breakpoint
CREATE TABLE "tradies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"avatar_url" text,
	"bio" varchar(150),
	"abn" varchar(11),
	"abn_verified_at" timestamp with time zone,
	"abn_entity_name" text,
	"abn_gst_registered" boolean DEFAULT false NOT NULL,
	"trade_type" "trade_type" NOT NULL,
	"trade_specialties" text[] DEFAULT '{}',
	"hourly_rate_cents" integer,
	"hourly_rate_public" boolean DEFAULT false NOT NULL,
	"callout_fee_cents" integer,
	"available_now" boolean DEFAULT true NOT NULL,
	"busy_until" timestamp with time zone,
	"emergency_callouts" boolean DEFAULT true NOT NULL,
	"weekend_work" boolean DEFAULT true NOT NULL,
	"after_hours_work" boolean DEFAULT false NOT NULL,
	"service_radius_km" integer DEFAULT 25 NOT NULL,
	"service_area_lat" numeric(10, 7),
	"service_area_lng" numeric(10, 7),
	"service_suburbs" text[] DEFAULT '{}',
	"vehicle_make" text,
	"vehicle_model" text,
	"vehicle_color" text,
	"vehicle_plate" text,
	"twilio_number" varchar(20),
	"call_recording_enabled" boolean DEFAULT false NOT NULL,
	"fcm_token" text,
	"fcm_token_updated_at" timestamp with time zone,
	"total_jobs_completed" integer DEFAULT 0 NOT NULL,
	"avg_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"avg_response_time_min" integer,
	"licence_verified" boolean DEFAULT false NOT NULL,
	"insurance_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tradies_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "tradies_phone_unique" UNIQUE("phone"),
	CONSTRAINT "tradies_email_unique" UNIQUE("email"),
	CONSTRAINT "tradies_abn_unique" UNIQUE("abn"),
	CONSTRAINT "tradies_twilio_number_unique" UNIQUE("twilio_number")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"address" text,
	"suburb" text,
	"state" varchar(3),
	"postcode" varchar(4),
	"notes" text,
	"total_jobs" integer DEFAULT 0 NOT NULL,
	"total_spent_cents" integer DEFAULT 0 NOT NULL,
	"last_job_at" timestamp with time zone,
	"source" "job_source" DEFAULT 'MANUAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"customer_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"job_type" text,
	"status" "job_status" DEFAULT 'UPCOMING' NOT NULL,
	"urgency" "urgency_level" DEFAULT 'FLEXIBLE' NOT NULL,
	"source" "job_source" DEFAULT 'MANUAL' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"estimated_duration_min" integer,
	"reminder_sent_at" timestamp with time zone,
	"address" text,
	"suburb" text,
	"state" varchar(3),
	"postcode" varchar(4),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"commuting_started_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"tracking_token" varchar(36),
	"tracking_token_expires_at" timestamp with time zone,
	"tracking_link_sent_at" timestamp with time zone,
	"call_log_id" uuid,
	"photos" text[] DEFAULT '{}',
	"notes" text,
	"parts_needed" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"qty" numeric(10, 3) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"unit" text DEFAULT 'item' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"parts_library_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid,
	"customer_id" uuid,
	"invoice_number" text NOT NULL,
	"invoice_prefix" varchar(10) DEFAULT 'INV' NOT NULL,
	"sequence_number" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"gst_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"overdue_reminder_sent_at" timestamp with time zone,
	"payment_method" "payment_method",
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"signature_data" text,
	"signed_at" timestamp with time zone,
	"pdf_url" text,
	"pdf_generated_at" timestamp with time zone,
	"xero_invoice_id" text,
	"xero_synced_at" timestamp with time zone,
	"xero_sync_error" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_job_id_unique" UNIQUE("job_id"),
	CONSTRAINT "invoices_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "invoices_xero_invoice_id_unique" UNIQUE("xero_invoice_id"),
	CONSTRAINT "invoices_tradie_seq_unique" UNIQUE("tradie_id","sequence_number")
);
--> statement-breakpoint
CREATE TABLE "location_pings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"accuracy" real,
	"speed" real,
	"heading" real,
	"altitude" real,
	"recorded_at" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'gps' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"current_lat" numeric(10, 7),
	"current_lng" numeric(10, 7),
	"last_ping_at" timestamp with time zone,
	"eta_minutes" integer,
	"eta_calculated_at" timestamp with time zone,
	"distance_remaining_km" numeric(6, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "tracking_sessions_tradie_id_unique" UNIQUE("tradie_id"),
	CONSTRAINT "tracking_sessions_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "trade_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"doc_type" "document_type" NOT NULL,
	"status" "document_status" DEFAULT 'PENDING' NOT NULL,
	"issuing_authority" text,
	"doc_number" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"storage_url" text,
	"storage_path" text,
	"mime_type" text,
	"file_size_bytes" integer,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"rejection_reason" text,
	"expiry_60_day_sent_at" timestamp with time zone,
	"expiry_30_day_sent_at" timestamp with time zone,
	"expiry_7_day_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"customer_id" uuid,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"job_type" text,
	"photos" text[] DEFAULT '{}',
	"reply_body" text,
	"replied_at" timestamp with time zone,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" json,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"fcm_message_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"actions" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"call_sid" text NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"duration_sec" integer,
	"recording_url" text,
	"recording_sid" text,
	"transcript" text,
	"extracted_data" json,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	"job_created" boolean DEFAULT false NOT NULL,
	"job_id" uuid,
	"call_started_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_logs_call_sid_unique" UNIQUE("call_sid")
);
--> statement-breakpoint
CREATE TABLE "earnings_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"period_type" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"total_earned_cents" integer DEFAULT 0 NOT NULL,
	"avg_job_value_cents" integer DEFAULT 0 NOT NULL,
	"total_hours_worked" numeric(6, 2) DEFAULT '0' NOT NULL,
	"pending_payout_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "earnings_tradie_period_unique" UNIQUE("tradie_id","period_type","period_start")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_payout_id" text,
	"stripe_account_id" text,
	"period_start_at" timestamp with time zone NOT NULL,
	"period_end_at" timestamp with time zone NOT NULL,
	"expected_arrival_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_stripe_payout_id_unique" UNIQUE("stripe_payout_id")
);
--> statement-breakpoint
CREATE TABLE "xero_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tradie_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"tenant_name" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disconnected_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"sync_error" text,
	CONSTRAINT "xero_connections_tradie_id_unique" UNIQUE("tradie_id")
);
--> statement-breakpoint
CREATE TABLE "parts_library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_type" "trade_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_price_cents" integer,
	"unit" text DEFAULT 'item' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_documents" ADD CONSTRAINT "trade_documents_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_summaries" ADD CONSTRAINT "earnings_summaries_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_connections" ADD CONSTRAINT "xero_connections_tradie_id_tradies_id_fk" FOREIGN KEY ("tradie_id") REFERENCES "public"."tradies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tradies_auth_user_idx" ON "tradies" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "tradies_trade_type_idx" ON "tradies" USING btree ("trade_type");--> statement-breakpoint
CREATE INDEX "tradies_location_idx" ON "tradies" USING btree ("service_area_lat","service_area_lng");--> statement-breakpoint
CREATE INDEX "tradies_active_idx" ON "tradies" USING btree ("is_active","licence_verified");--> statement-breakpoint
CREATE INDEX "customers_tradie_idx" ON "customers" USING btree ("tradie_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_tradie_phone_idx" ON "customers" USING btree ("tradie_id","phone");--> statement-breakpoint
CREATE INDEX "jobs_tradie_status_idx" ON "jobs" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "jobs_tradie_scheduled_idx" ON "jobs" USING btree ("tradie_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "jobs_customer_idx" ON "jobs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "jobs_tracking_token_idx" ON "jobs" USING btree ("tracking_token");--> statement-breakpoint
CREATE INDEX "jobs_status_scheduled_idx" ON "jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_tradie_status_idx" ON "invoices" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "invoices_tradie_created_idx" ON "invoices" USING btree ("tradie_id","created_at");--> statement-breakpoint
CREATE INDEX "invoices_stripe_idx" ON "invoices" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "invoices_status_due_idx" ON "invoices" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "location_pings_tradie_time_idx" ON "location_pings" USING btree ("tradie_id","recorded_at");--> statement-breakpoint
CREATE INDEX "location_pings_job_time_idx" ON "location_pings" USING btree ("job_id","recorded_at");--> statement-breakpoint
CREATE INDEX "location_pings_recorded_idx" ON "location_pings" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "tracking_sessions_tradie_active_idx" ON "tracking_sessions" USING btree ("tradie_id","is_active");--> statement-breakpoint
CREATE INDEX "tracking_sessions_job_idx" ON "tracking_sessions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "documents_tradie_type_idx" ON "trade_documents" USING btree ("tradie_id","doc_type");--> statement-breakpoint
CREATE INDEX "documents_tradie_status_idx" ON "trade_documents" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "documents_expiry_idx" ON "trade_documents" USING btree ("expires_at","status");--> statement-breakpoint
CREATE INDEX "reviews_tradie_public_idx" ON "reviews" USING btree ("tradie_id","is_public");--> statement-breakpoint
CREATE INDEX "reviews_tradie_rating_idx" ON "reviews" USING btree ("tradie_id","rating");--> statement-breakpoint
CREATE INDEX "reviews_tradie_created_idx" ON "reviews" USING btree ("tradie_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_tradie_read_idx" ON "notifications" USING btree ("tradie_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_tradie_created_idx" ON "notifications" USING btree ("tradie_id","created_at");--> statement-breakpoint
CREATE INDEX "call_logs_tradie_idx" ON "call_logs" USING btree ("tradie_id");--> statement-breakpoint
CREATE INDEX "call_logs_sid_idx" ON "call_logs" USING btree ("call_sid");--> statement-breakpoint
CREATE INDEX "earnings_tradie_period_idx" ON "earnings_summaries" USING btree ("tradie_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "payouts_tradie_status_idx" ON "payouts" USING btree ("tradie_id","status");--> statement-breakpoint
CREATE INDEX "payouts_tradie_created_idx" ON "payouts" USING btree ("tradie_id","created_at");--> statement-breakpoint
CREATE INDEX "parts_trade_active_idx" ON "parts_library_items" USING btree ("trade_type","is_active");
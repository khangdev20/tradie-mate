ALTER TABLE "tradies" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "terms_version" varchar(32);--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "privacy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "privacy_version" varchar(32);--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "disclaimer_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tradies" ADD COLUMN "disclaimer_version" varchar(32);

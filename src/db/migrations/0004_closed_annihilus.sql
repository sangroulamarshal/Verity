CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'FINANCE', 'ANALYST', 'VIEWER');--> statement-breakpoint
CREATE TABLE "transaction_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"category" varchar(100) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"counterparty" varchar(255),
	"payment_method" varchar(50),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_currency" varchar(3) NOT NULL,
	"target_currency" varchar(3) NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"source" varchar(50) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rate_time" timestamp with time zone,
	CONSTRAINT "fx_rates_pair_unique" UNIQUE("source_currency","target_currency")
);
--> statement-breakpoint
CREATE TABLE "organization_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'VIEWER' NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_unique";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "industry" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "base_currency" varchar(3) DEFAULT 'GBP' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "timezone" varchar(100) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'OWNER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "base_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "base_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchange_rate" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchange_rate_source" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "exchange_rate_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "counterparty" varchar(255);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" varchar(50);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "preset_id" uuid;--> statement-breakpoint
-- Backfill for rows that existed before this migration: before today,
-- a transaction's amount/currency WAS the only figure recorded — there
-- was no original-vs-base distinction yet. The only honest backfill is
-- base = original, rate = 1: we cannot ask the FX API for "what was the
-- rate on the date this old transaction was recorded" (it only serves
-- current rates), and inventing one would violate brief section 25
-- ("never fabricate a rate"). Rate = 1 with source = 'backfill' records
-- plainly that no real conversion happened for these rows, rather than
-- disguising a backfill as a real historical lookup.
--
-- Note for whoever reviews this: if an organization's pre-migration
-- transactions were already recorded in more than one currency, their
-- base_currency values will differ row-to-row after this backfill
-- (each keeps its own original currency) — the dashboard's sum-by-
-- base-currency will still be mixing currencies for that historical
-- data specifically, same as before this migration. Every transaction
-- created from this point forward is unaffected: it always gets a real
-- conversion into the organization's base currency at creation time.
UPDATE "transactions" SET
  "base_amount" = "amount",
  "base_currency" = "currency",
  "exchange_rate" = '1',
  "exchange_rate_source" = 'backfill',
  "exchange_rate_time" = "created_at"
WHERE "base_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "base_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "base_currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "exchange_rate" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "exchange_rate_source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "exchange_rate_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_presets" ADD CONSTRAINT "transaction_presets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_presets_org_id_idx" ON "transaction_presets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_invites_email_idx" ON "organization_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organization_invites_org_id_idx" ON "organization_invites" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_preset_id_transaction_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."transaction_presets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_org_id_idx" ON "users" USING btree ("organization_id");
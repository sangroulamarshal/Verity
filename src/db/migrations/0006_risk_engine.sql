CREATE TYPE "public"."risk_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."risk_status" AS ENUM('UNREVIEWED', 'REVIEWED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "risk_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"level" "risk_level" NOT NULL,
	"status" "risk_status" DEFAULT 'UNREVIEWED' NOT NULL,
	"signals" jsonb NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "risk_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "risk_level" "risk_level";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "risk_status" "risk_status";--> statement-breakpoint
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "risk_events_org_id_idx" ON "risk_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "risk_events_org_id_created_at_idx" ON "risk_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "risk_events_transaction_id_idx" ON "risk_events" USING btree ("transaction_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_org_id_risk_level_idx" ON "transactions" USING btree ("organization_id","risk_level");
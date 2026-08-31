CREATE TYPE "public"."risk_confidence" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
ALTER TABLE "risk_events" ADD COLUMN "confidence" "risk_confidence" DEFAULT 'MEDIUM' NOT NULL;
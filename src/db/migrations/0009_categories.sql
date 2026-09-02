CREATE TYPE "public"."category_type" AS ENUM('INCOME', 'EXPENSE', 'BOTH');--> statement-breakpoint
CREATE TABLE "categories" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name"            text NOT NULL,
  "type"            "category_type" NOT NULL,
  "is_archived"     boolean NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_org_id_idx" ON "categories" USING btree ("organization_id");

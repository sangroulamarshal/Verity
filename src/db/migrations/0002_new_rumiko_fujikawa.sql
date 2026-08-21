CREATE TYPE "public"."import_source" AS ENUM('CSV', 'EXCEL');--> statement-breakpoint
CREATE TABLE "import_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"source_column" varchar(255) NOT NULL,
	"target_field" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"filename" varchar(255) NOT NULL,
	"source" "import_source" NOT NULL,
	"row_count" integer NOT NULL,
	"valid_row_count" integer NOT NULL,
	"invalid_row_count" integer NOT NULL,
	"duplicate_row_count" integer NOT NULL,
	"inserted_row_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_mappings_import_id_idx" ON "import_mappings" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "imports_org_id_idx" ON "imports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "imports_org_id_created_at_idx" ON "imports" USING btree ("organization_id","created_at");
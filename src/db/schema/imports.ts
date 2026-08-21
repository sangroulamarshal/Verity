import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// Deliberately a separate enum from `transaction_source` (which also
// includes MANUAL) — an import row, by definition, only ever comes from
// a file.
export const importSourceEnum = pgEnum("import_source", ["CSV", "EXCEL"]);

/**
 * One row per completed import attempt — written once, at the end of a
 * successful commit, as a permanent audit record of what was imported and
 * with what outcome. This is NOT a scratch/staging table for an
 * in-progress wizard: the upload -> map -> preview steps hold their state
 * in the browser and re-send the file to the server each time, so there
 * is never a "PENDING" row left behind by an abandoned import (see
 * docs/ARCHITECTURE.md, Phase 4 section, for the full rationale).
 *
 * The outcome is fully described by the four counts below rather than a
 * separate `status` column — e.g. `insertedRowCount === 0` already means
 * "nothing usable was found in this file", which is self-explanatory
 * without inventing a FAILED/COMPLETED state machine for an MVP that only
 * ever writes this row after a successful transaction commit.
 */
export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Nullable, `set null`, same rationale as audit_logs.userId — the
    // import record should outlive the user account that ran it.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    filename: varchar("filename", { length: 255 }).notNull(),
    source: importSourceEnum("source").notNull(),

    rowCount: integer("row_count").notNull(),
    validRowCount: integer("valid_row_count").notNull(),
    invalidRowCount: integer("invalid_row_count").notNull(),
    duplicateRowCount: integer("duplicate_row_count").notNull(),
    insertedRowCount: integer("inserted_row_count").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("imports_org_id_idx").on(table.organizationId),
    index("imports_org_id_created_at_idx").on(table.organizationId, table.createdAt),
  ]
);

/**
 * The column mapping actually used for a given import — one row per
 * mapped target field. Kept as its own table (rather than a jsonb column
 * on `imports`) so it reads naturally either way: "what columns did this
 * import use" or, later, "what mapping did this org use last time"
 * (a possible Phase 5+ convenience — not built now, but this shape
 * supports it without a migration).
 */
export const importMappings = pgTable(
  "import_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importId: uuid("import_id")
      .notNull()
      .references(() => imports.id, { onDelete: "cascade" }),

    // The exact column header as it appeared in the source file.
    sourceColumn: varchar("source_column", { length: 255 }).notNull(),
    // One of the canonical target fields — see
    // features/imports/schema.ts `importTargetFieldSchema` for the
    // authoritative list. Left as free text here (not a pgEnum) so a
    // future target field can be added without a migration; the Zod
    // schema at the application boundary is what actually constrains it.
    targetField: varchar("target_field", { length: 50 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("import_mappings_import_id_idx").on(table.importId)]
);

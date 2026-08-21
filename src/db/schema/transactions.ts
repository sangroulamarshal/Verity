import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  date,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// INCOME/EXPENSE only, per brief — direction is carried by `type`, `amount`
// is always stored as a positive value. Keeping this as a constrained
// pgEnum (rather than free text) is the same "constrain the domain at the
// DB level" pattern organizations/users already follow.
export const transactionTypeEnum = pgEnum("transaction_type", ["INCOME", "EXPENSE"]);

// MANUAL is the only source Phase 3 ever writes. CSV/EXCEL are reserved
// for Phase 4's importer — added now so the column doesn't need a later
// migration, but nothing in this phase produces those values.
export const transactionSourceEnum = pgEnum("transaction_source", [
  "MANUAL",
  "CSV",
  "EXCEL",
]);

// NOTE on `customerId`: the brief's canonical Transaction model includes
// one, but `customers` doesn't exist until Phase 5 — see
// db/schema/index.ts's phase list. Adding an FK to a table that doesn't
// exist isn't possible, and a column with no FK (just a raw uuid) would
// violate "use foreign keys" for financial data. Phase 5 adds `customerId`
// as a proper FK via a migration once the customers table exists; nothing
// here needs to change to support that.
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Calendar date only (no time-of-day) — matches the brief's own
    // mapping example ("Transaction Date -> date") and what CSV/bank
    // exports actually provide. `createdAt` is available as a tiebreaker
    // if same-day ordering ever needs finer granularity.
    date: date("date", { mode: "string" }).notNull(),

    // Always positive; `type` carries direction. Stored as a string
    // (not a JS number) so no floating-point rounding is introduced
    // between the form, this column, and whatever reads it back —
    // money is parsed to a number only at the point of display/statistics,
    // never round-tripped through one silently.
    amount: numeric("amount", { precision: 14, scale: 2, mode: "string" }).notNull(),

    // ISO 4217-shaped (3 uppercase letters), not validated against a real
    // currency list yet — that's more machinery than an MVP needs.
    currency: varchar("currency", { length: 3 }).notNull(),

    type: transactionTypeEnum("type").notNull(),

    // Free text on purpose — the brief doesn't define a fixed category
    // taxonomy, and inventing one now would be scope creep. The risk
    // engine's "category changes" signal (Phase 6) just compares strings.
    category: varchar("category", { length: 100 }).notNull(),

    description: text("description"),
    referenceId: varchar("reference_id", { length: 255 }),

    source: transactionSourceEnum("source").notNull().default("MANUAL"),
    // Only meaningful for CSV/EXCEL rows (Phase 4) — null for manual entry.
    sourceRecordId: varchar("source_record_id", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transactions_org_id_idx").on(table.organizationId),
    // Covers the common "list this org's transactions, most recent first"
    // query without a separate single-column date index.
    index("transactions_org_id_date_idx").on(table.organizationId, table.date),
  ]
);

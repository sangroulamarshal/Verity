import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { transactionPresets } from "./transaction-presets";
import { transactionTypeEnum, transactionSourceEnum } from "./enums";

export { transactionTypeEnum, transactionSourceEnum };

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

    // --- Original transaction currency (what was actually paid/received) ---
    // Always positive; `type` carries direction. Stored as a string
    // (not a JS number) so no floating-point rounding is introduced
    // between the form, this column, and whatever reads it back —
    // money is parsed to a number only at the point of display/statistics,
    // never round-tripped through one silently.
    //
    // `amount` + `currency` are the ORIGINAL transaction amount/currency.
    // They are set once, at creation, and an edit can only change them to
    // reflect a correction to what was actually recorded — never silently
    // rewritten by a display-currency change or a same-day rate update.
    // See ARCHITECTURE.md / brief section 18 ("multi-currency system") for
    // the three-currency model this implements: original, organization
    // base, and per-user display (the last is computed at read time, not
    // stored).
    amount: numeric("amount", { precision: 14, scale: 2, mode: "string" }).notNull(),

    // ISO 4217-shaped (3 uppercase letters), not validated against a real
    // currency list yet — that's more machinery than an MVP needs.
    currency: varchar("currency", { length: 3 }).notNull(),

    // --- Organization base-currency snapshot, captured at write time ---
    // Set to `amount`/`currency` with exchangeRate = 1 when the
    // transaction's own currency already equals the org's base currency
    // (see src/server/services/fx.ts — no API call for that case). Never
    // recalculated from today's rate on read; that would silently move
    // historical figures every time the FX rate changes (brief section
    // 22). Re-deriving it (e.g. after correcting `amount`) happens only
    // by re-running the same conversion step the create/update action
    // already does, producing a new snapshot with a new `exchangeRateTime`
    // — not by mutating rate/time in place.
    baseAmount: numeric("base_amount", { precision: 14, scale: 2, mode: "string" }).notNull(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6, mode: "string" }).notNull(),
    exchangeRateSource: varchar("exchange_rate_source", { length: 50 }).notNull(),
    exchangeRateTime: timestamp("exchange_rate_time", { withTimezone: true }).notNull(),

    type: transactionTypeEnum("type").notNull(),

    // Free text on purpose — the brief doesn't define a fixed category
    // taxonomy, and inventing one now would be scope creep. The risk
    // engine's "category changes" signal (Phase 6) just compares strings.
    category: varchar("category", { length: 100 }).notNull(),

    // Free-text customer/vendor name (brief section 12/28). Not a `customerId`
    // FK — `customers` doesn't exist until Phase 5 (see note below) — so
    // this is deliberately a plain label, not a relationship, until then.
    counterparty: varchar("counterparty", { length: 255 }),
    paymentMethod: varchar("payment_method", { length: 50 }),

    description: text("description"),
    referenceId: varchar("reference_id", { length: 255 }),

    source: transactionSourceEnum("source").notNull().default("MANUAL"),
    // Only meaningful for CSV/EXCEL rows (Phase 4) — null for manual entry.
    sourceRecordId: varchar("source_record_id", { length: 255 }),

    // Set only when the transaction was created *from* a preset (brief
    // section 15 — presets are templates, not a live link that changes
    // history if the preset is edited later, so this is purely
    // provenance). `onDelete: "set null"` because deleting a preset must
    // never touch transactions already created from it.
    presetId: uuid("preset_id").references(() => transactionPresets.id, {
      onDelete: "set null",
    }),

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

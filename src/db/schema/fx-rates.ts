import { pgTable, uuid, varchar, numeric, timestamp, unique } from "drizzle-orm/pg-core";

// A cache of the *latest known* rate per currency pair, not a history —
// the rate actually used for any given transaction is captured directly
// on that transaction row (transactions.exchangeRate/.exchangeRateTime)
// at the moment it's created, so this table only needs to answer "do we
// already have a recent-enough rate for X→Y so we don't have to call the
// FX API again" (brief section 25). One row per (source, target) pair,
// upserted on each fresh fetch.
export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceCurrency: varchar("source_currency", { length: 3 }).notNull(),
    targetCurrency: varchar("target_currency", { length: 3 }).notNull(),
    rate: numeric("rate", { precision: 18, scale: 6, mode: "string" }).notNull(),
    // Matches transactions.exchangeRateSource's convention — a short
    // provider label, e.g. "allratestoday".
    source: varchar("source", { length: 50 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    // The provider's own quoted time for the rate, when available —
    // distinct from `fetchedAt` (when *we* retrieved it).
    rateTime: timestamp("rate_time", { withTimezone: true }),
  },
  (table) => [
    unique("fx_rates_pair_unique").on(table.sourceCurrency, table.targetCurrency),
  ]
);

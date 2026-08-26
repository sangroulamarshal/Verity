import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

// Base/reporting currency defaults to GBP (this firm's home currency) —
// every organization has exactly one, set at creation and editable from
// Settings > Organization. It is NEVER used to reinterpret a historical
// transaction's stored values, only as the default target for new
// conversions and as the dashboard's aggregation currency. See
// transactions.ts for why a transaction's own currency fields are
// separate and immutable.
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  industry: varchar("industry", { length: 100 }),
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("GBP"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

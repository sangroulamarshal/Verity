import { pgTable, uuid, varchar, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { transactionTypeEnum } from "./enums";

// A preset is a reusable template (brief section 15) — using one
// pre-fills the transaction form for review, it never writes a
// transaction by itself. There is deliberately no `lastUsedAt` /
// schedule / cron concept here (section 16: no recurring-transaction
// automation in this version).
export const transactionPresets = pgTable(
  "transaction_presets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2, mode: "string" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    counterparty: varchar("counterparty", { length: 255 }),
    paymentMethod: varchar("payment_method", { length: 50 }),
    description: text("description"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("transaction_presets_org_id_idx").on(table.organizationId)]
);

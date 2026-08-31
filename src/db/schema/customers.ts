import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// One `customers` table, not split into separate customers/vendors
// tables or a `kind` enum. `transactions.counterparty` (the free-text
// field this table's records get linked to via `customerId`) has
// always represented both directions — who paid the org, and who the
// org paid — with type/direction already carried by the transaction's
// own `type` field, not by the counterparty. A single record can
// legitimately be both (an org that both buys from and sells to the
// same counterparty), so splitting by kind here would just force a
// choice that isn't real. See transactions.ts's schema comment for the
// history of this decision — Phase 3 explicitly deferred it here.
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("customers_org_id_idx").on(table.organizationId),
    // Supports the customer picker's live search (name ILIKE) and the
    // customers list's default sort without a sequential scan once an
    // org has more than a handful of customers.
    index("customers_org_id_name_idx").on(table.organizationId, table.name),
  ]
);

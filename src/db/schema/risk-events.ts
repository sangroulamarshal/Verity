import {
  pgTable,
  uuid,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { transactions } from "./transactions";
import { users } from "./users";
import { riskLevelEnum, riskStatusEnum } from "./enums";
import type { RiskSignal } from "@/server/engines/risk-engine";

export { riskLevelEnum, riskStatusEnum };

// One row per risk evaluation, append-only — never updated or deleted
// once written (see server/services/risk.ts). This is what makes risk
// history real: if a transaction is edited and its score changes, a
// *new* row is inserted here rather than the old one being overwritten,
// so "what did we think this transaction's risk was before the edit"
// stays answerable (brief's Risk History section). Dismissing an alert
// changes `status` on the row itself via an explicit review action —
// it never deletes or replaces the row.
//
// `transactions.riskScore/riskLevel/riskStatus` are a denormalized
// pointer at whichever risk_events row is "current" for that
// transaction (see that table's comment) — this table is the durable
// log those columns are derived from.
export const riskEvents = pgTable(
  "risk_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),

    score: numeric("score", { precision: 5, scale: 2, mode: "number" }).notNull(),
    level: riskLevelEnum("level").notNull(),
    status: riskStatusEnum("status").notNull().default("UNREVIEWED"),

    // Array of { type, points, explanation } — see
    // server/engines/risk-engine.ts's RiskSignal type for the exact
    // shape. Stored as-is (not normalized into a separate signals
    // table) because signals are never queried independently of their
    // parent evaluation — every read of "why was this flagged" wants
    // the whole set for one risk_events row, never "find all
    // evaluations with signal type X across the organization."
    signals: jsonb("signals").notNull().$type<RiskSignal[]>(),

    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("risk_events_org_id_idx").on(table.organizationId),
    // "Recent anomalies" on the Risk overview page and the dashboard
    // widget — always scoped to one org, most recent first.
    index("risk_events_org_id_created_at_idx").on(table.organizationId, table.createdAt),
    // Transaction detail drawer's "risk history for this transaction"
    // and finding the current (latest) evaluation for a transaction.
    index("risk_events_transaction_id_idx").on(table.transactionId, table.createdAt),
  ]
);

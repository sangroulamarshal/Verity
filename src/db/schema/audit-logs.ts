import { pgTable, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// organizationId/userId are nullable on purpose: a failed login attempt
// (wrong password, unknown email) has no verified user or org yet, but is
// still worth recording. Never put a password or session token in
// `metadata` — see server/services/audit-log.ts.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_org_id_idx").on(table.organizationId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./users";
import { sessions } from "./sessions";
import { auditLogs } from "./audit-logs";
import { transactions } from "./transactions";
import { imports, importMappings } from "./imports";

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  user: one(users, {
    fields: [organizations.id],
    references: [users.organizationId],
  }),
  auditLogs: many(auditLogs),
  transactions: many(transactions),
  imports: many(imports),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [transactions.organizationId],
    references: [organizations.id],
  }),
}));

export const importsRelations = relations(imports, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [imports.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [imports.userId],
    references: [users.id],
  }),
  mappings: many(importMappings),
}));

export const importMappingsRelations = relations(importMappings, ({ one }) => ({
  import: one(imports, {
    fields: [importMappings.importId],
    references: [imports.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  imports: many(imports),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

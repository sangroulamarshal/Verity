import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./users";
import { sessions } from "./sessions";
import { auditLogs } from "./audit-logs";

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  user: one(users, {
    fields: [organizations.id],
    references: [users.organizationId],
  }),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
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

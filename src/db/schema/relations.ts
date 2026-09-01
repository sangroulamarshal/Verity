import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./users";
import { auditLogs } from "./audit-logs";
import { transactions } from "./transactions";
import { transactionPresets } from "./transaction-presets";
import { customers } from "./customers";
import { organizationInvites } from "./organization-invites";
import { imports, importMappings } from "./imports";
import { riskEvents } from "./risk-events";
import { invoices } from "./invoices";

export const organizationsRelations = relations(organizations, ({ many }) => ({
  // Was `one(users, ...)` — organizations now have many users (Members),
  // not exactly one, now that users.organizationId is no longer unique.
  users: many(users),
  auditLogs: many(auditLogs),
  transactions: many(transactions),
  transactionPresets: many(transactionPresets),
  customers: many(customers),
  invites: many(organizationInvites),
  imports: many(imports),
  riskEvents: many(riskEvents),
  invoices: many(invoices),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [transactions.organizationId],
    references: [organizations.id],
  }),
  preset: one(transactionPresets, {
    fields: [transactions.presetId],
    references: [transactionPresets.id],
  }),
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
  riskEvents: many(riskEvents),
}));

export const riskEventsRelations = relations(riskEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [riskEvents.organizationId],
    references: [organizations.id],
  }),
  transaction: one(transactions, {
    fields: [riskEvents.transactionId],
    references: [transactions.id],
  }),
  reviewedBy: one(users, {
    fields: [riskEvents.reviewedByUserId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  transactions: many(transactions),
}));

export const transactionPresetsRelations = relations(transactionPresets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [transactionPresets.organizationId],
    references: [organizations.id],
  }),
  transactions: many(transactions),
}));

export const organizationInvitesRelations = relations(organizationInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvites.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [organizationInvites.invitedByUserId],
    references: [users.id],
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
  auditLogs: many(auditLogs),
  imports: many(imports),
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

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  settledByTransaction: one(transactions, {
    fields: [invoices.settledByTransactionId],
    references: [transactions.id],
  }),
}));

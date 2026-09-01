// Entity tables are added phase-by-phase, not all at once:
//   Phase 2 — organizations, users, sessions, audit_logs
//   Phase 3 — transactions
//   Phase 4 — imports, import_mappings
//   Phase 4.5 — multi-currency, presets, members/roles,
//               org invites, settings (design/nav pass, no
//               new domain phase number — see docs/ARCHITECTURE.md)
//   Phase 5 — customers, also adds transactions.customerId as an FK
//   Phase 6 — risk_events
//   Phase 7B — invoices (Phase 7A was forecast engine + service, no new table)
//
// Every table added here that holds organization-owned data must include
// an `organizationId` foreign key — see docs/ARCHITECTURE.md before adding
// a table.
export * from "./enums";
export * from "./organizations";
export * from "./users";
export * from "./audit-logs";
export * from "./transaction-presets";
export * from "./customers";
export * from "./transactions";
export * from "./fx-rates";
export * from "./organization-invites";
export * from "./imports";
export * from "./risk-events";
export * from "./invoices";
export * from "./relations";

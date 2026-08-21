// Entity tables are added phase-by-phase, not all at once:
//   Phase 2 — organizations, users, sessions, audit_logs  <- this phase
//   Phase 3 — transactions
//   Phase 4 — imports, import_mappings
//   Phase 5 — customers
//   Phase 6 — risk_events
//   Phase 7 — cashflow_forecasts
//
// Every table added here that holds organization-owned data must include
// an `organizationId` foreign key — see docs/ARCHITECTURE.md before adding
// a table.
export * from "./organizations";
export * from "./users";
export * from "./sessions";
export * from "./audit-logs";
export * from "./relations";

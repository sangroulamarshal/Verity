import { pgEnum } from "drizzle-orm/pg-core";

// Shared between transactions.ts and transaction-presets.ts — a preset's
// `type` must be drawn from the exact same domain a transaction's is, so
// this lives in its own module rather than being defined in (and
// re-exported from) either of those, which would create a circular
// import once transactions.ts also needs to reference
// transaction_presets for `presetId`.
export const transactionTypeEnum = pgEnum("transaction_type", ["INCOME", "EXPENSE"]);

// MANUAL is the only source Phase 3 ever writes. CSV/EXCEL are reserved
// for Phase 4's importer.
export const transactionSourceEnum = pgEnum("transaction_source", [
  "MANUAL",
  "CSV",
  "EXCEL",
]);

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

// Phase 6 — Risk & Anomaly Engine. Four bands, not a raw 0-100 score
// alone, so the UI/filters/notifications have a small stable vocabulary
// to key off instead of every consumer re-implementing its own
// score -> bucket thresholds.
export const riskLevelEnum = pgEnum("risk_level", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// A transaction's risk review workflow. UNREVIEWED is the only level a
// fresh evaluation can produce — REVIEWED/DISMISSED only happen via an
// explicit user action (see server/services/risk.ts), never assigned by
// the scoring engine itself.
export const riskStatusEnum = pgEnum("risk_status", ["UNREVIEWED", "REVIEWED", "DISMISSED"]);

// How much historical data backed a risk evaluation's dominant signal
// (see server/engines/risk-engine.ts's confidence-vs-severity note) —
// deliberately separate from riskLevelEnum: an evaluation can be
// CRITICAL severity with LOW confidence (an extreme anomaly against
// thin history), and collapsing that into one scale would hide exactly
// the uncertainty a reviewer needs to see.
export const riskConfidenceEnum = pgEnum("risk_confidence", ["LOW", "MEDIUM", "HIGH"]);

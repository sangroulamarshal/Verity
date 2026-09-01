import { pgEnum } from "drizzle-orm/pg-core";

// Shared between transactions.ts and transaction-presets.ts -- a preset's
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

// Phase 6 -- Risk & Anomaly Engine. Four bands, not a raw 0-100 score
// alone, so the UI/filters/notifications have a small stable vocabulary
// to key off instead of every consumer re-implementing its own
// score -> bucket thresholds.
export const riskLevelEnum = pgEnum("risk_level", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// A transaction's risk review workflow. UNREVIEWED is the only level a
// fresh evaluation can produce -- REVIEWED/DISMISSED only happen via an
// explicit user action (see server/services/risk.ts), never assigned by
// the scoring engine itself.
export const riskStatusEnum = pgEnum("risk_status", ["UNREVIEWED", "REVIEWED", "DISMISSED"]);

// How much historical data backed a risk evaluation's dominant signal
// (see server/engines/risk-engine.ts's confidence-vs-severity note) --
// deliberately separate from riskLevelEnum: an evaluation can be
// CRITICAL severity with LOW confidence (an extreme anomaly against
// thin history), and collapsing that into one scale would hide exactly
// the uncertainty a reviewer needs to see.
export const riskConfidenceEnum = pgEnum("risk_confidence", ["LOW", "MEDIUM", "HIGH"]);

// Phase 7B -- Invoice Intelligence.
//
// Seven states matching the brief's invoice lifecycle exactly:
//
//   DRAFT        -- created but not yet sent; not yet a financial commitment.
//                  A draft invoice must NOT contribute to forecast income.
//   SENT         -- delivered to the customer; awaiting payment.
//   VIEWED       -- the customer has opened/acknowledged the invoice.
//   PARTIALLY_PAID -- partial payment received; remaining amount is still owed.
//   PAID         -- fully settled; must NOT appear as future expected income
//                  (money has already arrived -- counting it again would
//                  double-count it against actual recorded INCOME transactions).
//   OVERDUE      -- past due date and unpaid; included in forecast cautiously
//                  based on customer payment history.
//   CANCELLED    -- void; excluded from all forecasts.
//
// Only SENT, VIEWED, PARTIALLY_PAID, and OVERDUE contribute to
// expected future cash -- see server/services/invoices.ts for the
// exact filtering logic.
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

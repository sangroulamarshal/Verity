// Phase 6 — Risk & Anomaly Engine: pure scoring logic.
//
// Deliberately has zero database/framework dependencies, mirroring the
// existing normalization.ts / imports.ts split (Phase 4): this file is
// the deterministic, unit-testable "given these facts, what's the
// score" function; server/services/risk.ts is the DB-aware layer that
// gathers those facts (organization-scoped, currency-safe) and persists
// the result.
//
// Every signal here is a plain arithmetic rule over numbers the caller
// already computed — no ML model, no LLM, nothing non-deterministic.
// The score is never a black box: every point awarded is attached to a
// concrete, human-readable explanation (see RiskSignal below), and the
// same input always produces the same output.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskSignalType =
  | "UNUSUAL_AMOUNT"
  | "FREQUENCY_ANOMALY"
  | "DUPLICATE_SIMILAR"
  | "CUSTOMER_ANOMALY"
  | "CATEGORY_ANOMALY"
  | "NEW_CUSTOMER"
  | "ROUND_NUMBER"
  | "MANUAL_ENTRY_CONTEXT"
  | "IMPORT_CONTEXT";

export interface RiskSignal {
  type: RiskSignalType;
  points: number;
  explanation: string;
}

export interface RiskEvaluationResult {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
}

/** A historical mean to compare a new amount against, plus how many
 * transactions that mean is based on — never trusted below
 * MIN_SAMPLE_SIZE, so a brand-new organization/category/customer with
 * one or two transactions never gets a fabricated "anomaly" from a
 * mean of one data point. */
export interface AmountReference {
  mean: number;
  sampleSize: number;
}

export interface FrequencyContext {
  /** Transactions (including this one) inside a short lookback window
   * — e.g. the last hour for the same customer/organization. */
  windowCount: number;
  /** What that same window would normally contain, derived from the
   * entity's ordinary daily rate (e.g. dailyAverage / 24 for an
   * hourly window). */
  expectedWindowCount: number;
}

export interface CategoryTrendContext {
  /** This category's running total for the current period (e.g.
   * calendar month), including this transaction. */
  currentPeriodTotal: number;
  /** Average of the same category's total across prior comparable
   * periods. */
  averagePriorPeriodTotal: number;
  /** How many prior periods that average is based on. */
  periodsOfHistory: number;
}

export interface RiskEvaluationInput {
  baseAmount: number;
  source: "MANUAL" | "CSV" | "EXCEL";
  hasCustomer: boolean;
  /** True if the linked customer was created recently or has very few
   * prior transactions. Meaningless (ignored) when hasCustomer is false. */
  isNewOrInactiveCustomer: boolean;
  organizationAmountRef: AmountReference;
  categoryAmountRef: AmountReference;
  customerAmountRef: AmountReference | null;
  frequency: FrequencyContext | null;
  /** Count of *other* transactions matching this one closely enough
   * (amount + customer/reference within a tight window) to look like a
   * duplicate. 0 if none found. */
  duplicateMatchCount: number;
  categoryTrend: CategoryTrendContext | null;
}

const MIN_SAMPLE_SIZE = 3;

// 0-29 LOW, 30-59 MEDIUM, 60-79 HIGH, 80-100 CRITICAL — checked
// highest-first so a score of exactly 80 lands in CRITICAL, not HIGH.
const LEVEL_THRESHOLDS: ReadonlyArray<readonly [number, RiskLevel]> = [
  [80, "CRITICAL"],
  [60, "HIGH"],
  [30, "MEDIUM"],
];

export function riskLevelForScore(score: number): RiskLevel {
  for (const [min, level] of LEVEL_THRESHOLDS) {
    if (score >= min) return level;
  }
  return "LOW";
}

/** Shared ratio -> points curve used by every "amount is Nx normal"
 * signal below, scaled to that signal's own point cap. Flat, not
 * linear, on purpose — the brief's own example (6.2x -> 25/30 points)
 * is a step curve, not proportional, and a step curve is easier for a
 * person to reason about ("2-3x is a moderate bump, 5x+ is severe")
 * than an arbitrary linear formula would be. */
function amountRatioPoints(ratio: number, maxPoints: number): number {
  if (ratio >= 5) return maxPoints;
  if (ratio >= 3) return Math.round(maxPoints * 0.72);
  if (ratio >= 2) return Math.round(maxPoints * 0.46);
  if (ratio >= 1.5) return Math.round(maxPoints * 0.27);
  return 0;
}

/** A "nicely round" large amount — brief section 7, "a weak signal,
 * not a major risk factor by itself". Deliberately conservative
 * (>= 50,000 and an exact multiple of 10,000) so ordinary amounts like
 * 100 or 500 never trip it. */
export function isRoundNumber(amount: number): boolean {
  return amount >= 50_000 && amount % 10_000 === 0;
}

/**
 * Evaluate a single transaction's risk. Every branch either adds a
 * RiskSignal with a concrete explanation, or adds nothing — there is no
 * path that changes the score without also recording why.
 */
export function evaluateTransactionRisk(input: RiskEvaluationInput): RiskEvaluationResult {
  const signals: RiskSignal[] = [];

  // 1. Unusually large amount (0-30) — compared against this category's
  // history when there's enough of it (more specific), otherwise the
  // organization's overall history. Never both at once, so this never
  // double-counts the same underlying fact as signal 4 below.
  const magnitudeRef =
    input.categoryAmountRef.sampleSize >= MIN_SAMPLE_SIZE
      ? input.categoryAmountRef
      : input.organizationAmountRef;
  if (magnitudeRef.sampleSize >= MIN_SAMPLE_SIZE && magnitudeRef.mean > 0) {
    const ratio = input.baseAmount / magnitudeRef.mean;
    const points = amountRatioPoints(ratio, 30);
    if (points > 0) {
      const basis = magnitudeRef === input.categoryAmountRef ? "this category's" : "the organization's";
      signals.push({
        type: "UNUSUAL_AMOUNT",
        points,
        explanation: `Amount is ${ratio.toFixed(1)}x ${basis} normal transaction size.`,
      });
    }
  }

  // 2. Frequency anomaly (0-20) — a burst of activity relative to what's
  // normal for this window, e.g. 25/hour where ~2 would be expected.
  if (input.frequency && input.frequency.windowCount >= 3 && input.frequency.expectedWindowCount > 0) {
    const ratio = input.frequency.windowCount / input.frequency.expectedWindowCount;
    const points = amountRatioPoints(ratio, 20);
    if (points > 0) {
      signals.push({
        type: "FREQUENCY_ANOMALY",
        points,
        explanation: `${input.frequency.windowCount} similar transactions occurred where ~${Math.round(
          input.frequency.expectedWindowCount
        )} would be normal.`,
      });
    }
  }

  // 3. Duplicate/similar transaction (0-25). Flags only — never merges
  // or deletes anything (brief requirement).
  if (input.duplicateMatchCount > 0) {
    const points = Math.min(25, 15 + (input.duplicateMatchCount - 1) * 5);
    signals.push({
      type: "DUPLICATE_SIMILAR",
      points,
      explanation:
        input.duplicateMatchCount === 1
          ? "A matching transaction (amount, customer, and reference/timeframe) was recorded recently."
          : `${input.duplicateMatchCount} matching transactions were recorded recently.`,
    });
  }

  // 4. Customer-specific behavioral anomaly (0-15) — a *different*
  // reference population from signal 1 (this customer's own history,
  // not the org/category at large), so a customer who is individually
  // out-of-pattern is flagged even when the amount is unremarkable
  // organization-wide.
  if (
    input.hasCustomer &&
    input.customerAmountRef &&
    input.customerAmountRef.sampleSize >= MIN_SAMPLE_SIZE &&
    input.customerAmountRef.mean > 0
  ) {
    const ratio = input.baseAmount / input.customerAmountRef.mean;
    const points = amountRatioPoints(ratio, 15);
    if (points > 0) {
      signals.push({
        type: "CUSTOMER_ANOMALY",
        points,
        explanation: `Amount is ${ratio.toFixed(1)}x this customer's normal transaction size.`,
      });
    }
  }

  // 5. Category spending trend anomaly (0-15) — this period's category
  // total vs its own normal monthly level.
  if (
    input.categoryTrend &&
    input.categoryTrend.periodsOfHistory >= 2 &&
    input.categoryTrend.averagePriorPeriodTotal > 0
  ) {
    const ratio = input.categoryTrend.currentPeriodTotal / input.categoryTrend.averagePriorPeriodTotal;
    const points = amountRatioPoints(ratio, 15);
    if (points > 0) {
      signals.push({
        type: "CATEGORY_ANOMALY",
        points,
        explanation: `This category's spending this period is ${ratio.toFixed(1)}x its normal monthly level.`,
      });
    }
  }

  // 6. Weak contextual signals — capped low by construction (max 3 + 3 + 2
  // = 8) so none of these can push a score up on their own. Round-number
  // and new-customer are pure context; manual/import entry only ever
  // *amplifies* an already-flagged transaction (source signals are
  // mutually exclusive, so exactly one of the last two can ever fire).
  const primarySignalFired = signals.length > 0;
  if (isRoundNumber(input.baseAmount)) {
    signals.push({
      type: "ROUND_NUMBER",
      points: 3,
      explanation: "Transaction is an unusually large round-number amount.",
    });
  }
  if (input.hasCustomer && input.isNewOrInactiveCustomer) {
    signals.push({
      type: "NEW_CUSTOMER",
      points: 3,
      explanation: "Customer is new or has little prior transaction history.",
    });
  }
  if (primarySignalFired && input.source === "MANUAL") {
    signals.push({
      type: "MANUAL_ENTRY_CONTEXT",
      points: 2,
      explanation: "Manually entered, alongside other anomalies above.",
    });
  } else if (primarySignalFired && input.source !== "MANUAL") {
    signals.push({
      type: "IMPORT_CONTEXT",
      points: 2,
      explanation: "Imported transaction, alongside other anomalies above.",
    });
  }

  const score = Math.min(100, signals.reduce((sum, s) => sum + s.points, 0));
  return { score, level: riskLevelForScore(score), signals };
}

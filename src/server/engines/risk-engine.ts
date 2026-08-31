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
//
// --- Revision note (post-launch review) ---
// The original version of this file scored "how unusual is this
// amount" as a flat ratio-to-mean, capped at the same point value for
// any ratio >= 5x. That meant a 6x anomaly and a 921x anomaly produced
// an *identical* contribution, and because that contribution alone
// couldn't exceed a signal's own point cap, an extreme single-signal
// anomaly could be diluted into MEDIUM by the additive-score cap. Two
// changes fix this:
// 1. Amount comparisons now use the median and MAD (median absolute
//    deviation) of historical amounts, not the mean — a mean is
//    trivially distorted by the very outlier being evaluated (or by an
//    earlier one still sitting in history), which directly undermines
//    "can extreme outliers produce extreme scores" for every
//    transaction evaluated afterward. Median/MAD is the standard robust
//    alternative and is no more expensive to compute.
// 2. Anomaly magnitude is converted to a *severity tier* via a
//    continuous robust z-score, and each tier above SIGNIFICANT imposes
//    a minimum risk-level floor applied independently of the additive
//    score (see resolveLevel below). A 921x anomaly now floors at
//    CRITICAL regardless of what its capped point contribution alone
//    would total — the exact failure mode reported.
// Confidence (how much historical data backed the comparison) is now
// reported as a separate field rather than used to silently suppress
// severity — an extreme anomaly with thin history is surfaced as
// high-severity-but-low-confidence, not quietly downgraded.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

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
  /** How much historical data backed the *dominant* (highest-severity)
   * signal that fired. HIGH confidence with no signals firing simply
   * means "nothing unusual found", not "we're certain nothing is
   * wrong" — this reflects data backing, not a probability of fraud. */
  confidence: Confidence;
  signals: RiskSignal[];
}

/**
 * Robust historical baseline for comparing one amount against — median
 * (not mean, see file header) plus MAD (median absolute deviation) as
 * the spread measure, and the sample size both are based on.
 *
 * `mad` is expected to already be floor-protected by the caller (see
 * server/services/risk.ts's amountBaseline()) so a cluster of
 * near-identical historical amounts (MAD ~ 0) can't turn ordinary
 * variation into a spuriously enormous z-score.
 */
export interface AmountBaseline {
  median: number;
  mad: number;
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
  /** Median (not mean — see file header) of the same category's total
   * across prior comparable periods. */
  medianPriorPeriodTotal: number;
  /** How many prior periods that median is based on. */
  periodsOfHistory: number;
}

export interface RiskEvaluationInput {
  baseAmount: number;
  source: "MANUAL" | "CSV" | "EXCEL";
  hasCustomer: boolean;
  /** True if the linked customer was created recently or has very few
   * prior transactions. Meaningless (ignored) when hasCustomer is false. */
  isNewOrInactiveCustomer: boolean;
  organizationAmountBaseline: AmountBaseline;
  categoryAmountBaseline: AmountBaseline;
  customerAmountBaseline: AmountBaseline | null;
  frequency: FrequencyContext | null;
  /** Count of *other* transactions matching this one closely enough
   * (amount + customer/reference within a tight window) to look like a
   * duplicate. 0 if none found. */
  duplicateMatchCount: number;
  categoryTrend: CategoryTrendContext | null;
}

/** Below this, there isn't even enough data to compute a meaningful
 * spread (MAD needs at least 2 points to mean anything) — the signal is
 * skipped entirely rather than fabricated from 0-1 data points. This is
 * a hard floor for computing at all, distinct from `Confidence`, which
 * grades *how much* to trust a signal that did fire. */
const MIN_BASELINE_SAMPLE = 2;

function confidenceForSampleSize(n: number): Confidence {
  if (n >= 20) return "HIGH";
  if (n >= 5) return "MEDIUM";
  return "LOW";
}

// 0-29 LOW, 30-59 MEDIUM, 60-79 HIGH, 80-100 CRITICAL — checked
// highest-first so a score of exactly 80 lands in CRITICAL, not HIGH.
// The score is ordinal, not a probability: an 80 means "the additive
// evidence crossed the CRITICAL threshold", not "80% likely fraud" —
// nothing in this engine claims otherwise, and the UI must not either.
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

function minScoreForLevel(level: RiskLevel): number {
  const entry = LEVEL_THRESHOLDS.find(([, l]) => l === level);
  return entry ? entry[0] : 0;
}

const LEVEL_ORDER: readonly RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
function maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

/**
 * A nonlinear severity classification shared by every anomaly signal
 * below. This is the actual fix for "a 2x deviation and a 900x
 * deviation produce the same score": each tier maps to both a *larger*
 * fraction of a signal's point budget (see TIER_POINT_FRACTION) and,
 * for the top tiers, an escalation floor on the overall risk level
 * (see TIER_LEVEL_FLOOR) that the additive score's own cap cannot
 * suppress.
 */
type SeverityTier = "NONE" | "MILD" | "MODERATE" | "SIGNIFICANT" | "SEVERE" | "VERY_SEVERE" | "EXTREME";

const TIER_POINT_FRACTION: Record<SeverityTier, number> = {
  NONE: 0,
  MILD: 0.25,
  MODERATE: 0.5,
  SIGNIFICANT: 0.7,
  SEVERE: 0.85,
  VERY_SEVERE: 0.95,
  EXTREME: 1,
};

/** Only SIGNIFICANT and above impose a floor — MILD/MODERATE stay
 * governed purely by the additive score, so an ordinary "somewhat
 * bigger than usual" transaction doesn't force a minimum level on its
 * own. */
const TIER_LEVEL_FLOOR: Record<SeverityTier, RiskLevel | null> = {
  NONE: null,
  MILD: null,
  MODERATE: null,
  SIGNIFICANT: "MEDIUM",
  SEVERE: "HIGH",
  VERY_SEVERE: "HIGH",
  EXTREME: "CRITICAL",
};

/** Robust (modified) z-score tiers — thresholds follow the common
 * Iglewicz & Hoaglin convention that |z| > 3.5 indicates an outlier,
 * extended upward for the much larger deviations financial transaction
 * amounts can show (a legitimate one-off invoice can genuinely be
 * 10-50x a category's typical spend; only far beyond that does it
 * escalate the floor). */
function severityTierForZ(z: number): SeverityTier {
  if (z >= 150) return "EXTREME";
  if (z >= 40) return "VERY_SEVERE";
  if (z >= 15) return "SEVERE";
  if (z >= 7) return "SIGNIFICANT";
  if (z >= 3.5) return "MODERATE";
  if (z >= 2) return "MILD";
  return "NONE";
}

/** Same tier concept, but for signals naturally expressed as a plain
 * ratio-to-expected rather than a z-score (frequency bursts don't have
 * a natural median/MAD the way amounts do). */
function severityTierForRatio(ratio: number): SeverityTier {
  if (ratio >= 100) return "EXTREME";
  if (ratio >= 25) return "VERY_SEVERE";
  if (ratio >= 10) return "SEVERE";
  if (ratio >= 5) return "SIGNIFICANT";
  if (ratio >= 3) return "MODERATE";
  if (ratio >= 2) return "MILD";
  return "NONE";
}

interface AmountSignalOutcome {
  signal: RiskSignal | null;
  floor: RiskLevel | null;
  confidence: Confidence | null;
}

/** Shared by UNUSUAL_AMOUNT and CUSTOMER_ANOMALY — same statistical
 * treatment, different comparison population (see their call sites'
 * comments for why that's not double-counting). Only fires upward
 * (amount above baseline): an unusually *small* transaction isn't the
 * kind of risk this signal is about. */
function amountDeviationSignal(
  type: "UNUSUAL_AMOUNT" | "CUSTOMER_ANOMALY",
  amount: number,
  baseline: AmountBaseline,
  basisLabel: string,
  maxPoints: number
): AmountSignalOutcome {
  if (baseline.sampleSize < MIN_BASELINE_SAMPLE || baseline.median <= 0 || amount <= baseline.median) {
    return { signal: null, floor: null, confidence: null };
  }

  const z = (0.6745 * (amount - baseline.median)) / baseline.mad;
  const tier = severityTierForZ(z);
  if (tier === "NONE") return { signal: null, floor: null, confidence: null };

  const multiple = amount / baseline.median;
  const confidence = confidenceForSampleSize(baseline.sampleSize);
  const points = Math.round(maxPoints * TIER_POINT_FRACTION[tier]);

  return {
    signal: {
      type,
      points,
      explanation: `Amount is approximately ${multiple.toFixed(1)}x ${basisLabel}'s median transaction size (based on ${baseline.sampleSize} historical transaction${baseline.sampleSize === 1 ? "" : "s"}; confidence: ${confidence.toLowerCase()}).`,
    },
    floor: TIER_LEVEL_FLOOR[tier],
    confidence,
  };
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
  let escalationFloor: RiskLevel = "LOW";
  let dominantTierRank = -1;
  let dominantConfidence: Confidence = "HIGH";

  const rankOfFloor = (floor: RiskLevel | null): number => (floor ? LEVEL_ORDER.indexOf(floor) : 0);
  const considerFloor = (outcome: { floor: RiskLevel | null; confidence: Confidence | null }) => {
    const tierRank = rankOfFloor(outcome.floor);
    if (outcome.floor) escalationFloor = maxLevel(escalationFloor, outcome.floor);
    if (outcome.confidence && tierRank > dominantTierRank) {
      dominantTierRank = tierRank;
      dominantConfidence = outcome.confidence;
    }
  };

  // 1. Unusually large amount (0-30) — compared against this category's
  // history when there's enough of it (more specific), otherwise the
  // organization's overall history. Never both at once, so this never
  // double-counts the same underlying fact as signal 4 below.
  const magnitudeBaseline =
    input.categoryAmountBaseline.sampleSize >= MIN_BASELINE_SAMPLE
      ? input.categoryAmountBaseline
      : input.organizationAmountBaseline;
  const magnitudeBasis = magnitudeBaseline === input.categoryAmountBaseline ? "this category" : "the organization";
  const amountOutcome = amountDeviationSignal("UNUSUAL_AMOUNT", input.baseAmount, magnitudeBaseline, magnitudeBasis, 30);
  if (amountOutcome.signal) signals.push(amountOutcome.signal);
  considerFloor(amountOutcome);

  // 2. Frequency anomaly (0-20) — a burst of activity relative to what's
  // normal for this window, e.g. 25/hour where ~2 would be expected.
  if (input.frequency && input.frequency.windowCount >= 3 && input.frequency.expectedWindowCount > 0) {
    const ratio = input.frequency.windowCount / input.frequency.expectedWindowCount;
    const tier = severityTierForRatio(ratio);
    if (tier !== "NONE") {
      const points = Math.round(20 * TIER_POINT_FRACTION[tier]);
      signals.push({
        type: "FREQUENCY_ANOMALY",
        points,
        explanation: `${input.frequency.windowCount} similar transactions occurred where ~${Math.round(
          input.frequency.expectedWindowCount
        )} would be normal for this period (approximately ${ratio.toFixed(1)}x the expected rate).`,
      });
      considerFloor({ floor: TIER_LEVEL_FLOOR[tier], confidence: "HIGH" });
    }
  }

  // 3. Duplicate/similar transaction (0-25). Flags only — never merges
  // or deletes anything (brief requirement). Not put through the
  // severity-tier/escalation machinery above: "how many matches" isn't
  // a magnitude-of-deviation question the same way amount/frequency
  // are, so a simple additive scale is the right fit here.
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
  if (input.hasCustomer && input.customerAmountBaseline) {
    const customerOutcome = amountDeviationSignal(
      "CUSTOMER_ANOMALY",
      input.baseAmount,
      input.customerAmountBaseline,
      "this customer",
      15
    );
    if (customerOutcome.signal) signals.push(customerOutcome.signal);
    considerFloor(customerOutcome);
  }

  // 5. Category spending trend anomaly (0-15) — this period's category
  // total vs its own normal monthly level. Secondary/aggregate signal
  // (a slower-moving pattern, not a single-transaction magnitude
  // question) — kept on the additive scale only, no escalation floor,
  // consistent with the brief's framing of this as a softer check than
  // the per-transaction amount signals above.
  if (
    input.categoryTrend &&
    input.categoryTrend.periodsOfHistory >= 2 &&
    input.categoryTrend.medianPriorPeriodTotal > 0
  ) {
    const ratio = input.categoryTrend.currentPeriodTotal / input.categoryTrend.medianPriorPeriodTotal;
    const tier = severityTierForRatio(ratio);
    if (tier !== "NONE") {
      const points = Math.round(15 * TIER_POINT_FRACTION[tier]);
      signals.push({
        type: "CATEGORY_ANOMALY",
        points,
        explanation: `This category's spending this period is approximately ${ratio.toFixed(1)}x its normal monthly level (based on ${input.categoryTrend.periodsOfHistory} prior periods).`,
      });
    }
  }

  // 6. Weak contextual signals — capped low by construction (max 3 + 3 + 2
  // = 8) so none of these can push a score up on their own, and none
  // ever contributes an escalation floor. Round-number and new-customer
  // are pure context; manual/import entry only ever *amplifies* an
  // already-flagged transaction (source signals are mutually exclusive,
  // so exactly one of the last two can ever fire).
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

  const additiveScore = Math.min(100, signals.reduce((sum, s) => sum + s.points, 0));
  const scoreLevel = riskLevelForScore(additiveScore);

  // The actual fix for the reported bug: the final level is never
  // *below* what any single severe/extreme signal demands, regardless
  // of how the additive score capped that signal's point contribution.
  // The score is then raised to match (never lowered) so the displayed
  // number and the displayed level are never inconsistent with each
  // other — a CRITICAL result never shows a score of 35.
  const level = maxLevel(scoreLevel, escalationFloor);
  const score = level === scoreLevel ? additiveScore : Math.max(additiveScore, minScoreForLevel(level));

  // No signal fired at all -> nothing to be uncertain about. Otherwise,
  // confidence reflects whichever signal drove the highest severity
  // tier (the one most responsible for the result), not an average
  // across unrelated signals.
  const confidence: Confidence = dominantTierRank >= 0 ? dominantConfidence : "HIGH";

  return { score, level, confidence, signals };
}

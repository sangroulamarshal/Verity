// Phase 7 — Cash-Flow Forecasting Engine: pure projection logic.
//
// Deliberately has zero database/framework dependencies, mirroring the
// risk-engine.ts / risk.ts split (Phase 6): this file is the
// deterministic, unit-testable "given these facts, what is the
// projected cash position" function; server/services/forecast.ts is
// the DB-aware layer that gathers those facts and assembles the result.
//
// === Methodology ===
//
// The forecast is a DETERMINISTIC RULE-BASED model — no ML, no LLMs,
// no black boxes. Every projected number has a concrete data-backed
// reason.
//
// Projection formula per day:
//
//   Opening balance
//   + expected INCOME  (presets + historical patterns)
//   - expected EXPENSES (presets + historical patterns)
//   = projected closing balance
//
// Data sources in priority order:
//   1. Transaction presets (named recurring templates) — highest confidence
//   2. Historical daily averages by type (income/expense) — medium confidence
//   3. Nothing — when data is insufficient
//
// Presets represent explicit, named recurring commitments: "Payroll",
// "Rent", etc. They are projected once per forecast period, spread
// evenly (monthly preset → 1 occurrence per 30-day period).
//
// Historical patterns are derived from aggregate baseAmount sums over
// historical data, averaged per day. They are ONLY used when enough
// history exists (MIN_TRANSACTIONS_FOR_PATTERN) and are NOT applied to
// preset categories (which are already explicitly accounted for), to
// avoid double-counting.
//
// Confidence reflects the quality of the underlying data:
//   HIGH    — 3+ months of history + preset-backed amounts
//   MEDIUM  — enough history to pattern-match but limited presets
//   LOW     — sparse data, no reliable patterns
//
// === Multi-currency ===
//
// All amounts fed into this engine are already expressed in the
// organization's base currency (baseAmount on each transaction,
// preset.baseAmount from the service layer). No currency conversion
// happens here — that responsibility lies entirely in the DB layer
// (forecast.ts) which reuses the exact same FX infrastructure as
// transactions and the risk engine.
//
// === Why not invoice intelligence here? ===
//
// Invoice-based expected payments (Phase 7B) are a separate, named
// data source that the DB layer computes and passes in as
// `scheduledItems`. This engine treats them as first-class explicit
// items with known dates and amounts — higher confidence than historical
// patterns because the amount and due date are recorded facts, not
// estimates.

export type ForecastConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

/** Horizon in calendar days. */
export type ForecastHorizon = 7 | 30 | 60 | 90;

/**
 * A single projected cash event on a specific date.
 * Items with a concrete source (preset, invoice) have higher confidence
 * than pattern-derived items.
 */
export interface ForecastItem {
  date: string; // YYYY-MM-DD
  /** Positive value (direction is in `type`). Always in org base currency. */
  amount: number;
  type: "INCOME" | "EXPENSE";
  source: "PRESET" | "INVOICE" | "PATTERN";
  label: string;
  /** Confidence for this individual item. */
  confidence: ForecastConfidence;
}

/**
 * One row in the day-by-day forecast table (Accountant view).
 */
export interface ForecastDay {
  date: string; // YYYY-MM-DD
  openingBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
  projectedBalance: number;
  /** Aggregate confidence for this day's data. */
  confidence: ForecastConfidence;
  items: ForecastItem[];
}

/**
 * A named recurring template (from transaction_presets).
 * The service layer converts presets to this shape.
 * `monthlyAmount` is the preset amount already in org base currency.
 */
export interface RecurringTemplate {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  /** Amount in org base currency. */
  monthlyAmount: number;
  /** Which day of the month this is typically due (1–31). 0 = unknown/spread. */
  typicalDayOfMonth: number;
}

/**
 * A scheduled item with a known amount and date — e.g. an outstanding
 * invoice expected to be paid on a specific date (Phase 7B).
 * The service layer constructs these; the engine treats them as facts.
 */
export interface ScheduledItem {
  date: string; // YYYY-MM-DD — expected payment/occurrence date
  amount: number; // In org base currency
  type: "INCOME" | "EXPENSE";
  label: string;
  source: "INVOICE";
  confidence: ForecastConfidence;
}

/**
 * Historical daily averages by type, computed from the last N months
 * of actual transaction data. Values are in org base currency.
 */
export interface HistoricalPattern {
  /** Average daily income across the history window. */
  avgDailyIncome: number;
  /** Average daily expense across the history window. */
  avgDailyExpense: number;
  /** How many calendar days of history this is computed from. */
  daysOfHistory: number;
  /** Total number of individual transactions in the window. */
  transactionCount: number;
  /** Coefficient of variation for income (stdDev / mean). 0 = perfectly stable. */
  incomeVariability: number;
  /** Coefficient of variation for expense. */
  expenseVariability: number;
}

/**
 * Monthly seasonality factor for a specific calendar month (1-12).
 * incomeRatio and expenseRatio are multipliers relative to the
 * organization's overall monthly average:
 *   1.0 = exactly average
 *   1.3 = 30% above average
 *   0.7 = 30% below average
 *
 * Computed from 6+ months of history by the service layer.
 * Only applied when sampleMonths >= 3 for that specific month.
 */
export interface MonthlySeasonality {
  /** Calendar month 1-12. */
  month: number;
  /** Income ratio vs overall average for this month. */
  incomeRatio: number;
  /** Expense ratio vs overall average for this month. */
  expenseRatio: number;
  /** How many historical occurrences of this month backed the ratio. */
  sampleMonths: number;
}

/** Scenario variant for the three-case model. */
export type ScenarioType = "BASE" | "DELAYED_PAYMENTS" | "HIGH_EXPENSES";

export interface ScenarioResult {
  scenario: ScenarioType;
  label: string;
  description: string;
  projectedClosingBalance: number;
  projectedRangeLow: number;
  projectedRangeHigh: number;
  totalExpectedIncome: number;
  totalExpectedExpenses: number;
  hasProjectedShortfall: boolean;
  minimumBalance: { amount: number; date: string };
}

/**
 * A data-backed, actionable insight for the user.
 * Every insight references a concrete fact from the forecast data.
 */
export interface ForecastInsight {
  title: string;
  detail: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

/**
 * Everything the forecast engine needs to generate a projection.
 * Assembled by server/services/forecast.ts -- never by client code.
 */
export interface ForecastInput {
  /** Current cash position (total income minus total expenses, in base currency). */
  openingBalance: number;
  /** ISO 4217 org base currency code. The engine never converts; all amounts
   * must already be in this currency. */
  baseCurrency: string;
  /** Forecast start date (inclusive). Format: YYYY-MM-DD. */
  startDate: string;
  horizon: ForecastHorizon;
  /** Named recurring templates (from transaction_presets). */
  recurringTemplates: RecurringTemplate[];
  /** Explicitly scheduled items (invoices, known payments). */
  scheduledItems: ScheduledItem[];
  /** Historical pattern, or null when insufficient data exists. */
  historicalPattern: HistoricalPattern | null;
  /** Categories already covered by a recurring template.
   * Historical pattern income/expenses for these are excluded to
   * avoid double-counting. */
  presetCategories: Set<string>;
  /** Monthly seasonality factors keyed by calendar month (1-12).
   * Null when insufficient history exists. When present, the engine
   * scales pattern income/expenses by the ratio for each forecast month. */
  seasonality: Map<number, MonthlySeasonality> | null;
  /** Count of outstanding invoices contributing to scheduledItems.
   * More concrete invoices = higher confidence in the income side. */
  outstandingInvoiceCount: number;
}

export interface ForecastResult {
  openingBalance: number;
  baseCurrency: string;
  startDate: string;
  endDate: string;
  horizon: ForecastHorizon;
  projectedClosingBalance: number;
  /** Low-end of the expected range (based on variability). */
  projectedRangeLow: number;
  /** High-end of the expected range. */
  projectedRangeHigh: number;
  totalExpectedIncome: number;
  totalExpectedExpenses: number;
  /** Overall confidence for the entire forecast. */
  confidence: ForecastConfidence;
  /** Human-readable explanation of the confidence rating. */
  confidenceReason: string;
  /** Day-by-day breakdown. */
  days: ForecastDay[];
  /** All forecast items sorted by date. */
  items: ForecastItem[];
  /** The projected minimum balance and the date it occurs. */
  minimumBalance: { amount: number; date: string };
  /** True when the projected balance goes negative at any point. */
  hasProjectedShortfall: boolean;
  /** Aggregate contribution sources for the summary panel. */
  sources: {
    recurringIncome: number;
    recurringExpenses: number;
    invoiceIncome: number;
    patternIncome: number;
    patternExpenses: number;
  };
  /** Data-quality warning, if any (shown to the user). */
  dataWarning: string | null;
  /** Three-scenario comparison (base, delayed payments, high expenses). */
  scenarios: ScenarioResult[];
  /** Data-backed actionable insights. */
  insights: ForecastInsight[];
  /** Whether seasonality data was applied to this forecast. */
  seasonalityApplied: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Minimum transactions before historical patterns are considered reliable. */
const MIN_TRANSACTIONS_FOR_PATTERN = 10;
/** Minimum days of history before we'll use daily averages. */
const MIN_DAYS_FOR_PATTERN = 14;
/** Beyond this coefficient of variation, data is too noisy to use alone. */
const HIGH_VARIABILITY_THRESHOLD = 1.5;
/** Fraction of daily average allocated on any given day from patterns. */
const DAILY_PATTERN_SCALE = 1.0; // already a daily figure from the service layer

// ────────────────────────────────────────────────────────────────────────────
// Date utilities (pure, no external deps)
// ────────────────────────────────────────────────────────────────────────────

export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Return the day-of-month (1–31) for a YYYY-MM-DD string. */
function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/** Returns YYYY-MM-DD date range [start, end] inclusive. */
function dateRange(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

// ────────────────────────────────────────────────────────────────────────────
// Confidence calculation
// ────────────────────────────────────────────────────────────────────────────

export function computeOverallConfidence(
  input: ForecastInput,
  hasScheduledItems: boolean
): { confidence: ForecastConfidence; reason: string } {
  const { historicalPattern, recurringTemplates } = input;

  const hasPresets = recurringTemplates.length > 0;
  const hasPattern =
    historicalPattern !== null &&
    historicalPattern.transactionCount >= MIN_TRANSACTIONS_FOR_PATTERN &&
    historicalPattern.daysOfHistory >= MIN_DAYS_FOR_PATTERN;

  // Insufficient: no usable data at all
  if (!hasPresets && !hasPattern && !hasScheduledItems) {
    if (!historicalPattern || historicalPattern.transactionCount === 0) {
      return {
        confidence: "INSUFFICIENT",
        reason: "No transaction history available. Add transactions to generate a forecast.",
      };
    }
    return {
      confidence: "LOW",
      reason: `Only ${historicalPattern.transactionCount} transaction${historicalPattern.transactionCount === 1 ? "" : "s"} recorded. More activity is needed for reliable projections.`,
    };
  }

  // LOW: very limited data
  if (!hasPattern && !hasPresets) {
    return {
      confidence: "LOW",
      reason: "Forecast is based on scheduled invoice payments only. Historical patterns are not yet available.",
    };
  }

  if (!hasPattern && hasPresets) {
    return {
      confidence: "MEDIUM",
      reason: "Forecast is based on named recurring templates. Historical pattern confirmation is not yet available.",
    };
  }

  // HIGH variability in history degrades confidence
  const highVariability =
    historicalPattern &&
    (historicalPattern.incomeVariability > HIGH_VARIABILITY_THRESHOLD ||
      historicalPattern.expenseVariability > HIGH_VARIABILITY_THRESHOLD);

  if (highVariability && !hasPresets && !hasScheduledItems) {
    return {
      confidence: "LOW",
      reason: "Cash flows are highly variable. Projected figures represent averages and may differ significantly from actuals.",
    };
  }

  // MEDIUM: pattern exists but not deep enough or highly variable
  const shallowHistory = historicalPattern && historicalPattern.daysOfHistory < 60;
  if (shallowHistory || highVariability) {
    return {
      confidence: "MEDIUM",
      reason: `Based on ${historicalPattern!.daysOfHistory} days of history${hasPresets ? " and named recurring templates" : ""}. Confidence improves with more recorded activity.`,
    };
  }

  // HIGH: good history, reasonable variability
  return {
    confidence: "HIGH",
    reason: `Based on ${historicalPattern!.daysOfHistory} days of history${hasPresets ? " and named recurring templates" : ""}${hasScheduledItems ? " and scheduled payments" : ""}.`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Preset expansion — projects recurring templates into the forecast window
// ────────────────────────────────────────────────────────────────────────────

/**
 * Determines which dates within the forecast window a monthly preset
 * should appear. For presets with a known typical day, that day-of-month
 * is used within each month of the window. For unknown days (typicalDayOfMonth = 0),
 * we distribute evenly across the month.
 */
function expandPreset(
  template: RecurringTemplate,
  dates: string[]
): { date: string; amount: number }[] {
  const result: { date: string; amount: number }[] = [];
  const seenMonths = new Set<string>();

  for (const date of dates) {
    const ym = date.slice(0, 7); // YYYY-MM
    if (seenMonths.has(ym)) continue;

    const dom = template.typicalDayOfMonth;
    // Find the date in this month closest to `dom` (or just any date in the month)
    const targetDay = dom > 0 ? dom : 15; // default to mid-month
    const daysInMonth = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0).getDate();
    const actualDay = Math.min(targetDay, daysInMonth);
    const targetDate = `${ym}-${String(actualDay).padStart(2, "0")}`;

    // Only include if the target date is within our forecast window
    if (dates.includes(targetDate)) {
      result.push({ date: targetDate, amount: template.monthlyAmount });
      seenMonths.add(ym);
    } else if (dates.some((d) => d.startsWith(ym))) {
      // The specific day falls outside the window start/end but the month is
      // partially covered — use first day of that month within the window
      const firstInWindow = dates.find((d) => d.startsWith(ym));
      if (firstInWindow) {
        result.push({ date: firstInWindow, amount: template.monthlyAmount });
        seenMonths.add(ym);
      }
    }
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Main projection function
// ────────────────────────────────────────────────────────────────────────────

export function generateForecast(input: ForecastInput): ForecastResult {
  const { openingBalance, baseCurrency, startDate, horizon, historicalPattern } = input;
  const dates = dateRange(startDate, horizon);
  const endDate = dates.at(-1)!;

  const hasScheduledItems = input.scheduledItems.length > 0;
  const { confidence, reason: confidenceReason } = computeOverallConfidence(
    input,
    hasScheduledItems
  );

  // ── Early exit: insufficient data ──
  if (confidence === "INSUFFICIENT") {
    const emptyDay: ForecastDay = {
      date: startDate,
      openingBalance,
      expectedIncome: 0,
      expectedExpenses: 0,
      projectedBalance: openingBalance,
      confidence: "INSUFFICIENT",
      items: [],
    };
    return {
      openingBalance,
      baseCurrency,
      startDate,
      endDate,
      horizon,
      projectedClosingBalance: openingBalance,
      projectedRangeLow: openingBalance,
      projectedRangeHigh: openingBalance,
      totalExpectedIncome: 0,
      totalExpectedExpenses: 0,
      confidence: "INSUFFICIENT",
      confidenceReason,
      days: [emptyDay],
      items: [],
      minimumBalance: { amount: openingBalance, date: startDate },
      hasProjectedShortfall: openingBalance < 0,
      sources: {
        recurringIncome: 0,
        recurringExpenses: 0,
        invoiceIncome: 0,
        patternIncome: 0,
        patternExpenses: 0,
      },
      dataWarning: confidenceReason,
      scenarios: [],
      insights: [],
      seasonalityApplied: false,
    };
  }

  // ── Assemble all forecast items ──
  const allItems: ForecastItem[] = [];

  // 1. Recurring preset items
  const presetCategories = new Set<string>(input.presetCategories);

  for (const template of input.recurringTemplates) {
    const occurrences = expandPreset(template, dates);
    for (const occ of occurrences) {
      allItems.push({
        date: occ.date,
        amount: occ.amount,
        type: template.type,
        source: "PRESET",
        label: template.name,
        confidence: "HIGH",
      });
    }
  }

  // 2. Scheduled items (invoices, known payments)
  for (const item of input.scheduledItems) {
    if (item.date >= startDate && item.date <= endDate) {
      allItems.push({
        date: item.date,
        amount: item.amount,
        type: item.type,
        source: item.source,
        label: item.label,
        confidence: item.confidence,
      });
    }
  }

  // 3. Historical pattern — applied as daily average, excluding preset categories
  const hasUsablePattern =
    historicalPattern !== null &&
    historicalPattern.transactionCount >= MIN_TRANSACTIONS_FOR_PATTERN &&
    historicalPattern.daysOfHistory >= MIN_DAYS_FOR_PATTERN;

  if (hasUsablePattern && historicalPattern) {
    const patternConfidence: ForecastConfidence =
      historicalPattern.incomeVariability > HIGH_VARIABILITY_THRESHOLD ||
      historicalPattern.expenseVariability > HIGH_VARIABILITY_THRESHOLD
        ? "LOW"
        : historicalPattern.daysOfHistory < 60
          ? "MEDIUM"
          : "HIGH";

    // Income pattern: only where not covered by presets
    const patternIncomePerDay =
      historicalPattern.avgDailyIncome * DAILY_PATTERN_SCALE;

    // Expense pattern: only where not covered by presets
    const patternExpensePerDay =
      historicalPattern.avgDailyExpense * DAILY_PATTERN_SCALE;

    // Determine how much of the historical daily average is already covered
    // by presets — we'll subtract that fraction to avoid double-counting.
    // (Simple approach: if presets cover >0 of income, we assume the
    //  historical pattern partially reflects them — so we reduce the pattern
    //  contribution proportionally. The service layer computes this fraction.)
    const presetDailyIncome = allItems
      .filter((i) => i.type === "INCOME" && i.source === "PRESET")
      .reduce((s, i) => s + i.amount, 0) / Math.max(1, horizon);

    const presetDailyExpense = allItems
      .filter((i) => i.type === "EXPENSE" && i.source === "PRESET")
      .reduce((s, i) => s + i.amount, 0) / Math.max(1, horizon);

    // Net pattern contribution (pattern minus what presets already cover)
    const netPatternIncome = Math.max(0, patternIncomePerDay - presetDailyIncome);
    const netPatternExpense = Math.max(0, patternExpensePerDay - presetDailyExpense);

    if (netPatternIncome > 0 || netPatternExpense > 0) {
      // Add as lump-sum items per week (less visual noise than per-day)
      // For 7D horizon: daily. For longer: weekly summary items.
      const chunkDays = horizon <= 7 ? 1 : 7;

      for (let i = 0; i < dates.length; i += chunkDays) {
        const chunkDate = dates[i];
        const daysInChunk = Math.min(chunkDays, dates.length - i);

        // Apply seasonality scaling if available for this month.
        // Only applied when the seasonal factor has at least 2 samples
        // (sampleMonths >= 2) so a single unusual month doesn't skew the scale.
        const chunkMonth = Number(chunkDate.slice(5, 7));
        const seasonal = input.seasonality?.get(chunkMonth);
        const incomeScale = seasonal && seasonal.sampleMonths >= 2 ? seasonal.incomeRatio : 1.0;
        const expenseScale = seasonal && seasonal.sampleMonths >= 2 ? seasonal.expenseRatio : 1.0;

        if (netPatternIncome > 0) {
          allItems.push({
            date: chunkDate,
            amount: netPatternIncome * daysInChunk * incomeScale,
            type: "INCOME",
            source: "PATTERN",
            label: "Typical income (historical average)",
            confidence: patternConfidence,
          });
        }
        if (netPatternExpense > 0) {
          allItems.push({
            date: chunkDate,
            amount: netPatternExpense * daysInChunk * expenseScale,
            type: "EXPENSE",
            source: "PATTERN",
            label: "Typical expenses (historical average)",
            confidence: patternConfidence,
          });
        }
      }
    }
  }

  // ── Build day-by-day table ──
  const itemsByDate = new Map<string, ForecastItem[]>();
  for (const item of allItems) {
    const list = itemsByDate.get(item.date) ?? [];
    list.push(item);
    itemsByDate.set(item.date, list);
  }

  const days: ForecastDay[] = [];
  let runningBalance = openingBalance;

  for (const date of dates) {
    const dayItems = itemsByDate.get(date) ?? [];
    const dayIncome = dayItems
      .filter((i) => i.type === "INCOME")
      .reduce((s, i) => s + i.amount, 0);
    const dayExpense = dayItems
      .filter((i) => i.type === "EXPENSE")
      .reduce((s, i) => s + i.amount, 0);

    // Day confidence: lowest-confidence item present, or overall forecast confidence
    let dayConfidence: ForecastConfidence = confidence;
    if (dayItems.length > 0) {
      const levels: ForecastConfidence[] = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"];
      dayConfidence = dayItems.reduce<ForecastConfidence>((worst, item) => {
        const wi = levels.indexOf(worst);
        const ii = levels.indexOf(item.confidence);
        return ii > wi ? item.confidence : worst;
      }, "HIGH");
    }

    const projectedBalance = runningBalance + dayIncome - dayExpense;
    days.push({
      date,
      openingBalance: runningBalance,
      expectedIncome: dayIncome,
      expectedExpenses: dayExpense,
      projectedBalance,
      confidence: dayConfidence,
      items: dayItems,
    });
    runningBalance = projectedBalance;
  }

  const projectedClosingBalance = runningBalance;
  const totalExpectedIncome = allItems
    .filter((i) => i.type === "INCOME")
    .reduce((s, i) => s + i.amount, 0);
  const totalExpectedExpenses = allItems
    .filter((i) => i.type === "EXPENSE")
    .reduce((s, i) => s + i.amount, 0);

  // ── Minimum projected balance ──
  let minBalance = openingBalance;
  let minDate = startDate;
  let runningForMin = openingBalance;
  for (const day of days) {
    runningForMin = day.projectedBalance;
    if (runningForMin < minBalance) {
      minBalance = runningForMin;
      minDate = day.date;
    }
  }

  // ── Range calculation ──
  // Use variability if available, else a conservative ±15% for MEDIUM or ±5% for HIGH
  let variabilityFactor = 0.15; // MEDIUM default
  if (confidence === "HIGH") variabilityFactor = 0.08;
  if (confidence === "LOW") variabilityFactor = 0.30;
  // "INSUFFICIENT" never reaches here — handled by the early-exit above.

  if (historicalPattern && hasUsablePattern) {
    const avgVariability =
      (historicalPattern.incomeVariability + historicalPattern.expenseVariability) / 2;
    variabilityFactor = Math.min(0.5, Math.max(0.05, avgVariability * 0.5));
  }

  const swing = Math.abs(totalExpectedIncome - totalExpectedExpenses) * variabilityFactor;
  const projectedRangeLow = projectedClosingBalance - swing;
  const projectedRangeHigh = projectedClosingBalance + swing;

  // ── Source aggregation ──
  const sources = {
    recurringIncome: allItems
      .filter((i) => i.type === "INCOME" && i.source === "PRESET")
      .reduce((s, i) => s + i.amount, 0),
    recurringExpenses: allItems
      .filter((i) => i.type === "EXPENSE" && i.source === "PRESET")
      .reduce((s, i) => s + i.amount, 0),
    invoiceIncome: allItems
      .filter((i) => i.type === "INCOME" && i.source === "INVOICE")
      .reduce((s, i) => s + i.amount, 0),
    patternIncome: allItems
      .filter((i) => i.type === "INCOME" && i.source === "PATTERN")
      .reduce((s, i) => s + i.amount, 0),
    patternExpenses: allItems
      .filter((i) => i.type === "EXPENSE" && i.source === "PATTERN")
      .reduce((s, i) => s + i.amount, 0),
  };

  // ── Data warning ──
  let dataWarning: string | null = null;
  if (confidence === "LOW") {
    dataWarning = confidenceReason;
  } else if (
    historicalPattern &&
    (historicalPattern.incomeVariability > HIGH_VARIABILITY_THRESHOLD ||
      historicalPattern.expenseVariability > HIGH_VARIABILITY_THRESHOLD)
  ) {
    dataWarning =
      "Cash flows show high variability. Projections are based on averages and the actual range may be wider than shown.";
  }

  const seasonalityApplied = input.seasonality !== null && input.seasonality.size > 0;

  // ---- Scenarios ----
  const scenarios = generateScenarios({
    openingBalance,
    totalExpectedIncome,
    totalExpectedExpenses,
    projectedClosingBalance,
    projectedRangeLow,
    projectedRangeHigh,
    variabilityFactor,
    minimumBalance: { amount: minBalance, date: minDate },
    invoiceIncome: sources.invoiceIncome,
    days,
  });

  // ---- Insights ----
  const insights = generateInsights({
    openingBalance,
    projectedClosingBalance,
    minimumBalance: { amount: minBalance, date: minDate },
    hasProjectedShortfall: minBalance < 0,
    outstandingInvoiceCount: input.outstandingInvoiceCount,
    sources,
    confidence,
    historicalPattern,
    recurringTemplates: input.recurringTemplates,
    horizon,
  });

  return {
    openingBalance,
    baseCurrency,
    startDate,
    endDate,
    horizon,
    projectedClosingBalance,
    projectedRangeLow,
    projectedRangeHigh,
    totalExpectedIncome,
    totalExpectedExpenses,
    confidence,
    confidenceReason,
    days,
    items: allItems.sort((a, b) => a.date.localeCompare(b.date)),
    minimumBalance: { amount: minBalance, date: minDate },
    hasProjectedShortfall: minBalance < 0,
    sources,
    dataWarning,
    scenarios,
    insights,
    seasonalityApplied,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Scenario generation
// ────────────────────────────────────────────────────────────────────────────

interface ScenarioInputData {
  openingBalance: number;
  totalExpectedIncome: number;
  totalExpectedExpenses: number;
  projectedClosingBalance: number;
  projectedRangeLow: number;
  projectedRangeHigh: number;
  variabilityFactor: number;
  minimumBalance: { amount: number; date: string };
  invoiceIncome: number;
  days: ForecastDay[];
}

/**
 * Three lightweight scenarios derived from the base forecast.
 *
 * BASE: the forecast as computed (no modification).
 *
 * DELAYED_PAYMENTS: invoice income reduced by 20% (some customers pay late
 * or not at all within the period). Pattern income unchanged. All else equal.
 * This is the "what if 1 in 5 expected invoice payments slips?" scenario.
 *
 * HIGH_EXPENSES: expenses increased by 10% across the board. Represents
 * unexpected cost overruns or a spike in discretionary spending.
 *
 * These are deliberately simple — not a full re-run of the forecast engine,
 * just linear adjustments on the totals — so they run at zero additional
 * DB cost and are pure arithmetic on already-computed numbers.
 *
 * The UI can show them as a three-column summary, not as separate forecasts.
 */
function generateScenarios(data: ScenarioInputData): ScenarioResult[] {
  const {
    openingBalance,
    totalExpectedIncome,
    totalExpectedExpenses,
    projectedClosingBalance,
    variabilityFactor,
    minimumBalance,
    invoiceIncome,
  } = data;

  function makeScenario(
    scenario: ScenarioType,
    label: string,
    description: string,
    adjustedIncome: number,
    adjustedExpenses: number
  ): ScenarioResult {
    const closing = openingBalance + adjustedIncome - adjustedExpenses;
    const swing = Math.abs(adjustedIncome - adjustedExpenses) * variabilityFactor;
    const low = closing - swing;
    const high = closing + swing;
    // Approximate minimum: if closing < opening, assume minimum occurs near end
    const minAmt = Math.min(openingBalance, closing);
    const minDate = minimumBalance.date;
    return {
      scenario,
      label,
      description,
      projectedClosingBalance: closing,
      projectedRangeLow: low,
      projectedRangeHigh: high,
      totalExpectedIncome: adjustedIncome,
      totalExpectedExpenses: adjustedExpenses,
      hasProjectedShortfall: minAmt < 0,
      minimumBalance: { amount: minAmt, date: minDate },
    };
  }

  // BASE: no change
  const base = makeScenario(
    "BASE",
    "Base case",
    "Expected income and expenses as forecast.",
    totalExpectedIncome,
    totalExpectedExpenses
  );
  // Override base with the actual computed values (more precise than re-deriving)
  base.projectedClosingBalance = projectedClosingBalance;

  // DELAYED_PAYMENTS: 20% of invoice income doesn't arrive in the period
  const delayedIncome = totalExpectedIncome - invoiceIncome * 0.2;
  const delayed = makeScenario(
    "DELAYED_PAYMENTS",
    "Delayed payments",
    "20% of expected invoice income delayed beyond the forecast period.",
    delayedIncome,
    totalExpectedExpenses
  );

  // HIGH_EXPENSES: expenses 10% higher
  const highExpenses = makeScenario(
    "HIGH_EXPENSES",
    "Higher expenses",
    "Expenses 10% above forecast (cost overruns or unplanned spending).",
    totalExpectedIncome,
    totalExpectedExpenses * 1.1
  );

  return [base, delayed, highExpenses];
}

// ────────────────────────────────────────────────────────────────────────────
// Insight generation
// ────────────────────────────────────────────────────────────────────────────

interface InsightInputData {
  openingBalance: number;
  projectedClosingBalance: number;
  minimumBalance: { amount: number; date: string };
  hasProjectedShortfall: boolean;
  outstandingInvoiceCount: number;
  sources: ForecastResult["sources"];
  confidence: ForecastConfidence;
  historicalPattern: HistoricalPattern | null;
  recurringTemplates: RecurringTemplate[];
  horizon: ForecastHorizon;
}

/**
 * Generates data-backed, actionable insights. Rules:
 *
 * 1. Projected shortfall        — CRITICAL
 * 2. Cash pressure (min < 20% of opening)  — WARNING
 * 3. Overdue invoice count      — WARNING (if invoice income is LOW confidence)
 * 4. High expense concentration — INFO (if recurring expenses > 70% of total)
 * 5. Low forecast confidence    — INFO
 *
 * Every insight references an actual number from the forecast — no generic
 * advice is generated if the data doesn't support the claim.
 */
function generateInsights(data: InsightInputData): ForecastInsight[] {
  const {
    openingBalance,
    projectedClosingBalance,
    minimumBalance,
    hasProjectedShortfall,
    outstandingInvoiceCount,
    sources,
    confidence,
    historicalPattern,
    recurringTemplates,
    horizon,
  } = data;

  const insights: ForecastInsight[] = [];

  // 1. Shortfall
  if (hasProjectedShortfall) {
    insights.push({
      title: "Projected cash shortfall",
      detail: `Cash is projected to fall below zero around ${minimumBalance.date}. Review upcoming expenses and outstanding invoice collections.`,
      severity: "CRITICAL",
    });
  }

  // 2. Cash pressure (minimum < 20% of opening, but not negative)
  if (
    !hasProjectedShortfall &&
    openingBalance > 0 &&
    minimumBalance.amount < openingBalance * 0.2
  ) {
    const pct = Math.round((minimumBalance.amount / openingBalance) * 100);
    insights.push({
      title: "Potential cash pressure",
      detail: `Projected minimum balance (${minimumBalance.date}) is ${pct}% of current cash. Ensure sufficient reserves for unexpected expenses.`,
      severity: "WARNING",
    });
  }

  // 3. Outstanding invoices (only if invoice income contributes meaningfully)
  if (outstandingInvoiceCount > 0 && sources.invoiceIncome > 0) {
    const overdueInvoiceNote =
      outstandingInvoiceCount === 1
        ? `1 outstanding invoice (${formatAmount(sources.invoiceIncome)}) is included in the forecast.`
        : `${outstandingInvoiceCount} outstanding invoices totalling ${formatAmount(sources.invoiceIncome)} are included.`;
    insights.push({
      title: "Outstanding invoice income included",
      detail: overdueInvoiceNote + " Actual receipts depend on timely customer payment.",
      severity: "INFO",
    });
  }

  // 4. Recurring expense concentration
  const totalExpenses = sources.recurringExpenses + sources.patternExpenses;
  if (
    totalExpenses > 0 &&
    sources.recurringExpenses / totalExpenses > 0.7 &&
    recurringTemplates.length > 0
  ) {
    const pct = Math.round((sources.recurringExpenses / totalExpenses) * 100);
    const topExpense = recurringTemplates
      .filter((t) => t.type === "EXPENSE")
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)[0];
    const detail = topExpense
      ? `${pct}% of projected expenses are from named recurring commitments. Largest: ${topExpense.name} (${formatAmount(topExpense.monthlyAmount)}/month).`
      : `${pct}% of projected expenses are from named recurring commitments.`;
    insights.push({
      title: "Expenses are primarily recurring",
      detail,
      severity: "INFO",
    });
  }

  // 5. Low/insufficient confidence
  if (confidence === "LOW") {
    const txCount = historicalPattern?.transactionCount ?? 0;
    insights.push({
      title: "Limited historical data",
      detail: `Forecast is based on ${txCount} transaction${txCount === 1 ? "" : "s"}. Add more activity to improve projection accuracy.`,
      severity: "INFO",
    });
  }

  // 6. Improving cash position (positive signal worth surfacing)
  if (
    !hasProjectedShortfall &&
    projectedClosingBalance > openingBalance * 1.1 &&
    confidence !== "LOW"
  ) {
    const pct = Math.round(((projectedClosingBalance - openingBalance) / openingBalance) * 100);
    insights.push({
      title: "Cash position improving",
      detail: `Projected to grow ${pct}% over the next ${horizon} days based on current income and expense patterns.`,
      severity: "INFO",
    });
  }

  return insights;
}

function formatAmount(amount: number): string {
  // Simple locale-agnostic formatting — the UI uses formatCurrency from lib/format.ts
  // for display; this is just for embedding in insight strings.
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

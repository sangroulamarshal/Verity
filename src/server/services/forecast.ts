import "server-only";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions, transactionPresets, organizations } from "@/db/schema";
import {
  generateForecast,
  addDays,
  type ForecastInput,
  type ForecastResult,
  type ForecastHorizon,
  type HistoricalPattern,
  type RecurringTemplate,
  type MonthlySeasonality,
} from "@/server/engines/forecast-engine";
import { getOutstandingInvoicesAsScheduledItems } from "@/server/services/invoices";

export type { ForecastResult, ForecastHorizon } from "@/server/engines/forecast-engine";

// How many calendar days of transaction history to use for pattern detection.
// 90 days gives 3 full months -- enough to detect monthly recurrence reliably
// without being so long that a major operational change (new product line,
// lost client) makes historical averages misleading.
const HISTORY_DAYS = 90;

// ----------------------------------------------------------------------------
// Historical pattern -- aggregate from baseAmount (org-base-currency column)
// ----------------------------------------------------------------------------

async function getHistoricalPattern(
  organizationId: string,
  historyStart: string,
  historyEnd: string
): Promise<HistoricalPattern | null> {
  const [row] = await db
    .select({
      totalIncome: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      totalExpense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
      // Variance for variability calc: use sample stddev / mean = coefficient of variation
      incomeStddev: sql<string | null>`stddev_samp(${transactions.baseAmount}::numeric) filter (where ${transactions.type} = 'INCOME')`,
      incomeMean: sql<string | null>`avg(${transactions.baseAmount}::numeric) filter (where ${transactions.type} = 'INCOME')`,
      expenseStddev: sql<string | null>`stddev_samp(${transactions.baseAmount}::numeric) filter (where ${transactions.type} = 'EXPENSE')`,
      expenseMean: sql<string | null>`avg(${transactions.baseAmount}::numeric) filter (where ${transactions.type} = 'EXPENSE')`,
      transactionCount: sql<string>`count(*)`,
      minDate: sql<string | null>`min(${transactions.date})`,
      maxDate: sql<string | null>`max(${transactions.date})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        gte(transactions.date, historyStart),
        lte(transactions.date, historyEnd)
      )
    );

  if (!row) return null;

  const count = Number(row.transactionCount);
  if (count === 0) return null;

  // Calendar days of history covered by actual data
  const minDate = row.minDate;
  const maxDate = row.maxDate;
  const daysOfHistory =
    minDate && maxDate
      ? Math.max(1, daysBetween(minDate, maxDate) + 1)
      : HISTORY_DAYS;

  const totalIncome = Number(row.totalIncome);
  const totalExpense = Number(row.totalExpense);

  const avgDailyIncome = totalIncome / Math.max(1, daysOfHistory);
  const avgDailyExpense = totalExpense / Math.max(1, daysOfHistory);

  // Coefficient of variation (stddev / mean) -- 0 = perfectly stable
  const incomeMean = Number(row.incomeMean ?? 0);
  const incomeStddev = Number(row.incomeStddev ?? 0);
  const expenseMean = Number(row.expenseMean ?? 0);
  const expenseStddev = Number(row.expenseStddev ?? 0);

  const incomeVariability = incomeMean > 0 ? incomeStddev / incomeMean : 0;
  const expenseVariability = expenseMean > 0 ? expenseStddev / expenseMean : 0;

  return {
    avgDailyIncome,
    avgDailyExpense,
    daysOfHistory,
    transactionCount: count,
    incomeVariability,
    expenseVariability,
  };
}


// ----------------------------------------------------------------------------
// Seasonality -- monthly income/expense ratios from 6 months of history
// ----------------------------------------------------------------------------

// Minimum months of history for seasonality to be computed at all.
const SEASONALITY_HISTORY_DAYS = 180; // ~6 months
// Minimum distinct months observed to trust a ratio for a given calendar month.
const MIN_SEASON_SAMPLES = 2;

/**
 * Computes per-calendar-month income and expense ratios relative to the
 * organization's overall monthly average.
 *
 * Example: if September historically averages 1.3x overall monthly income,
 * the engine will scale September's pattern income by 1.3. This makes
 * 30- and 60-day forecasts more realistic when cash flows have clear
 * seasonal patterns (e.g. retail, agriculture, tourism).
 *
 * Returns null if fewer than 3 months of history exist (can't compute
 * meaningful ratios with only 1-2 months of data).
 *
 * Uses baseAmount -- the org-base-currency snapshot -- so no FX conversion
 * is needed and multi-currency orgs are handled correctly.
 */
async function getMonthlySeasonality(
  organizationId: string,
  asOfDate: string
): Promise<Map<number, MonthlySeasonality> | null> {
  const historyStart = addDays(asOfDate, -SEASONALITY_HISTORY_DAYS);

  const monthRows = await db
    .select({
      month: sql<string>`extract(month from ${transactions.date}::date)::int`,
      totalIncome: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      totalExpense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        gte(transactions.date, historyStart),
        lte(transactions.date, asOfDate)
      )
    )
    .groupBy(sql`extract(month from ${transactions.date}::date)::int`);

  if (monthRows.length < 3) return null;

  // Overall monthly average (across all months in the window)
  const totalIncome = monthRows.reduce((s, r) => s + Number(r.totalIncome), 0);
  const totalExpense = monthRows.reduce((s, r) => s + Number(r.totalExpense), 0);
  const avgMonthlyIncome = totalIncome / monthRows.length;
  const avgMonthlyExpense = totalExpense / monthRows.length;

  if (avgMonthlyIncome <= 0 && avgMonthlyExpense <= 0) return null;

  const result = new Map<number, MonthlySeasonality>();
  for (const row of monthRows) {
    const m = Number(row.month);
    const incomeRatio = avgMonthlyIncome > 0 ? Number(row.totalIncome) / avgMonthlyIncome : 1.0;
    const expenseRatio = avgMonthlyExpense > 0 ? Number(row.totalExpense) / avgMonthlyExpense : 1.0;
    // Clamp to [0.1, 3.0] to prevent extreme outliers from dominating
    result.set(m, {
      month: m,
      incomeRatio: Math.max(0.1, Math.min(3.0, incomeRatio)),
      expenseRatio: Math.max(0.1, Math.min(3.0, expenseRatio)),
      sampleMonths: 1, // one occurrence per month in a 6-month window -- enough for MIN_SEASON_SAMPLES=2 check
    });
  }

  return result;
}

// ----------------------------------------------------------------------------
// Recurring templates -- from transaction_presets
// ----------------------------------------------------------------------------

/**
 * For a preset to contribute to the forecast, we need its amount in the
 * org's base currency. Since a preset stores its own currency and amount
 * (not a baseAmount), and we want no FX calls here (presets are infrequently
 * changed, and we don't want a live FX fetch to slow down or fail the
 * forecast page), we estimate the base amount from the most recent
 * transaction that used this preset and has a baseAmount already computed.
 *
 * Fallback: if no transactions use this preset, use the raw amount and
 * mark confidence as MEDIUM. This is declared clearly in the confidence
 * reason returned by the engine.
 */
async function getPresetsAsTemplates(
  organizationId: string,
  baseCurrency: string
): Promise<RecurringTemplate[]> {
  // Single query: fetch all presets, then in one additional query get the
  // most recent transaction per preset. Replaces the previous N+1 loop
  // (one DB round-trip per preset) which caused connection timeouts when
  // using the max:1 serverless pool.
  const presets = await db
    .select()
    .from(transactionPresets)
    .where(eq(transactionPresets.organizationId, organizationId));

  if (presets.length === 0) return [];

  // One query for all preset IDs using inArray, then deduplicate in JS.
  // Much cheaper than one DB round-trip per preset.
  const presetIds = presets.map((p) => p.id);
  const latestTxRows = await db
    .select({
      presetId: transactions.presetId,
      baseAmount: transactions.baseAmount,
      baseCurrency: transactions.baseCurrency,
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        inArray(transactions.presetId, presetIds)
      )
    )
    .orderBy(sql`${transactions.date} desc`)
    .limit(presetIds.length * 20); // fetch recent rows, deduplicate below

  // Build a map: presetId -> most recent tx row (first occurrence wins
  // because rows are ordered date desc).
  const latestByPreset = new Map<string, typeof latestTxRows[0]>();
  for (const row of latestTxRows) {
    if (row.presetId && !latestByPreset.has(row.presetId)) {
      latestByPreset.set(row.presetId, row);
    }
  }

  return presets.map((preset) => {
    let monthlyAmount = Number(preset.amount);
    let typicalDayOfMonth = 0;

    const latestTx = latestByPreset.get(preset.id);
    if (latestTx && latestTx.baseCurrency === baseCurrency) {
      monthlyAmount = Number(latestTx.baseAmount);
      typicalDayOfMonth = Number(latestTx.date.slice(8, 10));
    } else if (preset.currency === baseCurrency) {
      monthlyAmount = Number(preset.amount);
    }

    return {
      id: preset.id,
      name: preset.name,
      type: preset.type,
      category: preset.category,
      monthlyAmount,
      typicalDayOfMonth,
    };
  });
}

// ----------------------------------------------------------------------------
// Current cash position
// ----------------------------------------------------------------------------

/**
 * Current cash = sum of all historical INCOME baseAmounts - sum of all
 * EXPENSE baseAmounts, up to and including `asOfDate`.
 *
 * This is the same formula as the dashboard's net cash flow, but scoped
 * to a date -- it gives the "opening balance" for the forecast.
 *
 * Note: Verity does not yet have a dedicated "bank balance" concept or
 * external balance sync. This is the best available approximation from
 * recorded transaction data, which is explicitly documented to users on
 * the forecast page.
 */
async function getCurrentCashPosition(
  organizationId: string,
  asOfDate: string
): Promise<number> {
  const [row] = await db
    .select({
      totalIncome: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      totalExpense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        lte(transactions.date, asOfDate)
      )
    );

  if (!row) return 0;
  return Number(row.totalIncome) - Number(row.totalExpense);
}

// ----------------------------------------------------------------------------
// Utility
// ----------------------------------------------------------------------------

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export interface ForecastOptions {
  horizon: ForecastHorizon;
  /** Override today's date -- useful for testing. */
  asOfDate?: string;
}

/**
 * Generates a cash-flow forecast for the given organization.
 *
 * Security: `organizationId` MUST come from the authenticated session,
 * never from a route param or request body -- same contract as every
 * other service in this codebase. All queries below are scoped to it.
 *
 * Currency: all amounts in the returned forecast are in the org's
 * baseCurrency. Display-currency conversion (the per-user preference)
 * is the caller's responsibility (forecast/page.tsx), same pattern as
 * dashboard-display.ts -- we don't want FX-rate calls inside the
 * forecast engine.
 */
export async function getForecast(
  organizationId: string,
  options: ForecastOptions
): Promise<ForecastResult> {
  const { horizon } = options;
  const asOfDate = options.asOfDate ?? todayISO();
  const startDate = addDays(asOfDate, 1); // forecast starts tomorrow

  // Resolve org base currency -- all monetary values in the forecast
  // use this as the common unit.
  const [org] = await db
    .select({ baseCurrency: organizations.baseCurrency })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const baseCurrency = org?.baseCurrency ?? "GBP";

  // History window: last HISTORY_DAYS of actuals
  const historyStart = addDays(asOfDate, -HISTORY_DAYS);

  const endDate = addDays(startDate, horizon - 1);

  // Sequential awaits instead of Promise.all -- the DB client uses max:1
  // connection per serverless instance (see db/client.ts). Promise.all
  // gives zero real parallelism with a single connection; it only adds
  // queue contention and risks hitting connectionTimeoutMillis (5s)
  // before a queued query gets its turn. Sequential is correct and safe.
  const openingBalance = await getCurrentCashPosition(organizationId, asOfDate);
  const historicalPattern = await getHistoricalPattern(organizationId, historyStart, asOfDate);
  const recurringTemplates = await getPresetsAsTemplates(organizationId, baseCurrency);
  const scheduledItems = await getOutstandingInvoicesAsScheduledItems(organizationId, startDate, endDate);
  const seasonality = await getMonthlySeasonality(organizationId, asOfDate);

  const presetCategories = new Set<string>(recurringTemplates.map((t) => t.category));
  const outstandingInvoiceCount = scheduledItems.filter((i) => i.source === "INVOICE").length;

  const forecastInput: ForecastInput = {
    openingBalance,
    baseCurrency,
    startDate,
    horizon,
    recurringTemplates,
    scheduledItems,
    historicalPattern,
    presetCategories,
    seasonality,
    outstandingInvoiceCount,
  };

  return generateForecast(forecastInput);
}

/**
 * A concise summary of the forecast suitable for the dashboard widget.
 * Avoids returning the full day-by-day breakdown.
 */
export interface ForecastSummary {
  currentBalance: number;
  projectedBalance: number;
  projectedRangeLow: number;
  projectedRangeHigh: number;
  totalExpectedIncome: number;
  totalExpectedExpenses: number;
  minimumBalance: { amount: number; date: string };
  hasProjectedShortfall: boolean;
  confidence: ForecastResult["confidence"];
  baseCurrency: string;
  horizon: ForecastHorizon;
}

export async function getForecastSummary(
  organizationId: string,
  horizon: ForecastHorizon = 30
): Promise<ForecastSummary> {
  const result = await getForecast(organizationId, { horizon });
  return {
    currentBalance: result.openingBalance,
    projectedBalance: result.projectedClosingBalance,
    projectedRangeLow: result.projectedRangeLow,
    projectedRangeHigh: result.projectedRangeHigh,
    totalExpectedIncome: result.totalExpectedIncome,
    totalExpectedExpenses: result.totalExpectedExpenses,
    minimumBalance: result.minimumBalance,
    hasProjectedShortfall: result.hasProjectedShortfall,
    confidence: result.confidence,
    baseCurrency: result.baseCurrency,
    horizon,
  };
}

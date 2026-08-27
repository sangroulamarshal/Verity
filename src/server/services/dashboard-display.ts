import "server-only";
import { getExchangeRate, FxRateUnavailableError } from "@/server/services/fx";
import { convertAmount } from "@/lib/money";
import type { DashboardSummary } from "@/server/services/dashboard";

export interface DisplaySummary {
  summary: DashboardSummary;
  currency: string;
  /** True when a personal display currency was requested but the rate
   * couldn't be obtained — the caller falls back to showing the org's
   * base currency instead, same graceful-degradation contract every
   * other FX call site in this codebase follows (never guess a rate,
   * never crash the page over a conversion that can't be done). */
  rateUnavailable: boolean;
}

/**
 * Converts the dashboard's aggregate totals to the signed-in user's
 * display-currency preference. Unlike the transactions table
 * (withDisplayAmounts, which handles many distinct base currencies
 * across a page of rows), every row summed into these totals already
 * shares one currency — the organization's base currency — so this
 * only ever needs a single rate lookup, not one per row.
 *
 * Pulled out of dashboard/page.tsx into its own module so this logic —
 * the FX call, the rate-unavailable fallback, the sign-preserving
 * conversion of a possibly-negative netCashFlow — can be unit tested
 * directly, the same way every other piece of money/FX logic in this
 * codebase (lib/money.ts, features/transactions/schema.ts) already is.
 */
export async function resolveDisplaySummary(
  summary: DashboardSummary,
  baseCurrency: string,
  displayCurrency: string
): Promise<DisplaySummary> {
  if (baseCurrency.toUpperCase() === displayCurrency.toUpperCase()) {
    return { summary, currency: baseCurrency, rateUnavailable: false };
  }

  let rate;
  try {
    rate = await getExchangeRate(baseCurrency, displayCurrency);
  } catch (error) {
    if (error instanceof FxRateUnavailableError) {
      return { summary, currency: baseCurrency, rateUnavailable: true };
    }
    throw error;
  }

  const convert = (amount: number) => Number(convertAmount(amount.toFixed(2), rate.rate));

  return {
    summary: {
      ...summary,
      totalIncome: convert(summary.totalIncome),
      totalExpense: convert(summary.totalExpense),
      netCashFlow: convert(summary.netCashFlow),
      monthlyTotals: summary.monthlyTotals.map((month) => ({
        ...month,
        income: convert(month.income),
        expense: convert(month.expense),
      })),
    },
    currency: displayCurrency,
    rateUnavailable: false,
  };
}

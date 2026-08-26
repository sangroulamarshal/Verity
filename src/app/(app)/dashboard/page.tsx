import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { getDashboardSummary, type DashboardSummary } from "@/server/services/dashboard";
import { getExchangeRate, FxRateUnavailableError } from "@/server/services/fx";
import { convertAmount } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
};

interface DisplaySummary {
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
 */
async function resolveDisplaySummary(
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

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  const change = ((current - previous) / previous) * 100;
  return change;
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 text-xs font-medium " +
        (up ? "text-income" : "text-destructive")
      }
    >
      <Icon className="size-3.5" />
      {Math.abs(value).toFixed(1)}% vs previous month
    </span>
  );
}

export default async function DashboardPage() {
  const session = await verifySession();

  const [[org], summary] = await Promise.all([
    db
      .select({ name: organizations.name, baseCurrency: organizations.baseCurrency })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1),
    getDashboardSummary(session.organizationId),
  ]);

  const baseCurrency = org?.baseCurrency ?? "GBP";
  const requestedCurrency = session.displayCurrency ?? baseCurrency;
  const {
    summary: displaySummary,
    currency,
    rateUnavailable,
  } = await resolveDisplaySummary(summary, baseCurrency, requestedCurrency);

  const months = displaySummary.monthlyTotals;
  const current = months.at(-1);
  const previous = months.at(-2);

  const incomeChange = current && previous ? percentChange(current.income, previous.income) : null;
  const expenseChange = current && previous ? percentChange(current.expense, previous.expense) : null;
  const netChange =
    current && previous
      ? percentChange(current.income - current.expense, previous.income - previous.expense)
      : null;

  const hasActivity = displaySummary.transactionCount > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          {org?.name ?? "Your organization"}
        </h1>
        {rateUnavailable && (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing totals in {baseCurrency} — the exchange rate to {requestedCurrency} is
            currently unavailable.
          </p>
        )}
      </div>

      {!hasActivity ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium">No financial activity yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Record your first transaction or import a statement to see revenue, expenses,
              and cash flow here.
            </p>
            <div className="mt-2 flex gap-2">
              <Button asChild size="sm">
                <Link href="/transactions">Add a transaction</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/imports">Import a statement</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-0">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(displaySummary.totalIncome, currency)}
                </p>
                <ChangeBadge value={incomeChange} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-0">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(displaySummary.totalExpense, currency)}
                </p>
                <ChangeBadge value={expenseChange !== null ? -expenseChange : null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Net cash flow
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-0">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(displaySummary.netCashFlow, currency)}
                </p>
                <ChangeBadge value={netChange} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Cash flow</CardTitle>
            </CardHeader>
            <CardContent>
              <CashFlowChart data={months} />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent transactions</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/transactions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul>
                {summary.recentTransactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.category}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(t.date)}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>
                    <p
                      className={
                        "shrink-0 tabular-nums font-medium " +
                        (t.type === "INCOME" ? "text-income" : "text-expense")
                      }
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatCurrency(t.amount, t.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

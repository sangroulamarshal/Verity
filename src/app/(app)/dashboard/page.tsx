import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { getDashboardSummary } from "@/server/services/dashboard";
import { resolveDisplaySummary } from "@/server/services/dashboard-display";
import { getRiskSummary } from "@/server/services/risk";
import { getForecastSummary } from "@/server/services/forecast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
};

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
  // Sequential -- single connection pool (max:1) means Promise.all adds
  // timeout risk with no parallelism benefit. getForecastSummary is
  // wrapped in try/catch so a forecast failure never breaks the dashboard.
  const riskSummary = await getRiskSummary(session.organizationId);
  const forecastSummary = await getForecastSummary(session.organizationId, 30).catch(() => null);

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
            Showing totals in {baseCurrency} -- the exchange rate to {requestedCurrency} is
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
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(t.amount, t.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {riskSummary.totalAnalyzed > 0 && (
            <Card className="mt-4">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Risk</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/risk">Review risk &rarr;</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                    {riskSummary.counts.HIGH}
                  </p>
                  <p className="text-xs text-muted-foreground">High</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-destructive">
                    {riskSummary.counts.CRITICAL}
                  </p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                {riskSummary.requiringReview > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {riskSummary.requiringReview} transaction
                    {riskSummary.requiringReview === 1 ? "" : "s"} require review
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {forecastSummary && forecastSummary.confidence !== "INSUFFICIENT" && (
            <Card className="mt-4">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Cash flow forecast</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/cashflow">View forecast</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatCurrency(forecastSummary.currentBalance, forecastSummary.baseCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">30-day projected</p>
                  <p className={cn(
                    "text-xl font-semibold tabular-nums",
                    forecastSummary.projectedBalance < 0 ? "text-destructive" : ""
                  )}>
                    {formatCurrency(forecastSummary.projectedBalance, forecastSummary.baseCurrency)}
                  </p>
                </div>
                {forecastSummary.hasProjectedShortfall && (
                  <p className="text-sm font-medium text-destructive">
                    Projected shortfall around {forecastSummary.minimumBalance.date}
                  </p>
                )}
                <div className="sm:ml-auto">
                  <span className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                    forecastSummary.confidence === "HIGH"
                      ? "bg-income/15 text-green-700 dark:text-green-400"
                      : forecastSummary.confidence === "MEDIUM"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                  )}>
                    {forecastSummary.confidence === "HIGH"
                      ? "High confidence"
                      : forecastSummary.confidence === "MEDIUM"
                        ? "Medium confidence"
                        : "Low confidence"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

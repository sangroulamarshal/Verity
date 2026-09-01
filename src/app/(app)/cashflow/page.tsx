import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { AlertTriangle, TrendingUp, TrendingDown, Info } from "lucide-react";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { getForecast } from "@/server/services/forecast";
import { getExchangeRate, FxRateUnavailableError } from "@/server/services/fx";
import { convertAmount } from "@/lib/money";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForecastChart } from "@/components/forecast-chart";
import { HorizonSelector } from "@/features/forecast/horizon-selector";
import { ConfidenceBadge } from "@/features/forecast/confidence-badge";
import type { ForecastHorizon } from "@/server/engines/forecast-engine";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cash Flow",
};

const VALID_HORIZONS: ForecastHorizon[] = [7, 30, 60, 90];

function parseHorizon(raw: string | undefined): ForecastHorizon {
  const n = Number(raw);
  return (VALID_HORIZONS.includes(n as ForecastHorizon) ? n : 30) as ForecastHorizon;
}

function deltaLabel(from: number, to: number): string {
  if (from <= 0) return "";
  const pct = ((to - from) / Math.abs(from)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export default async function CashFlowPage(props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = await props.searchParams;
  const session = await verifySession();
  const horizon = parseHorizon(searchParams.horizon);

  const [org] = await db
    .select({ baseCurrency: organizations.baseCurrency })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  const baseCurrency = org?.baseCurrency ?? "GBP";
  const displayCurrency = session.displayCurrency ?? baseCurrency;

  // Generate forecast in base currency
  const forecast = await getForecast(session.organizationId, { horizon });

  // Convert to display currency if needed
  let rate = "1";
  let rateUnavailable = false;
  if (displayCurrency !== baseCurrency) {
    try {
      const r = await getExchangeRate(baseCurrency, displayCurrency);
      rate = r.rate;
    } catch (e) {
      if (e instanceof FxRateUnavailableError) {
        rateUnavailable = true;
      } else throw e;
    }
  }

  function convert(amount: number): number {
    if (rateUnavailable || displayCurrency === baseCurrency) return amount;
    return Number(convertAmount(amount.toFixed(2), rate));
  }

  const currency = rateUnavailable ? baseCurrency : displayCurrency;

  const openingDisplay = convert(forecast.openingBalance);
  const closingDisplay = convert(forecast.projectedClosingBalance);
  const incomeDisplay = convert(forecast.totalExpectedIncome);
  const expenseDisplay = convert(forecast.totalExpectedExpenses);
  const minDisplay = convert(forecast.minimumBalance.amount);
  const rangeLow = convert(forecast.projectedRangeLow);
  const rangeHigh = convert(forecast.projectedRangeHigh);

  const isInsufficient = forecast.confidence === "INSUFFICIENT";
  const delta = deltaLabel(openingDisplay, closingDisplay);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cash Flow</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Based on recorded transactions, recurring commitments, and outstanding invoices.
            {rateUnavailable && (
              <span className="ml-1">
                Showing amounts in {baseCurrency} (exchange rate to {displayCurrency} unavailable).
              </span>
            )}
          </p>
        </div>
        <HorizonSelector current={horizon} />
      </div>

      {isInsufficient ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium">Not enough data to generate a forecast</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {forecast.confidenceReason}
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                href="/transactions"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Add transactions
              </Link>
              <Link
                href="/imports"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                Import a statement
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Current cash
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xl font-semibold tabular-nums">
                  {formatCurrency(openingDisplay, currency)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Opening balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {horizon}-day projected
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p
                  className={cn(
                    "text-xl font-semibold tabular-nums",
                    closingDisplay < 0 ? "text-destructive" : ""
                  )}
                >
                  {formatCurrency(closingDisplay, currency)}
                </p>
                {delta && (
                  <p
                    className={cn(
                      "mt-0.5 flex items-center gap-0.5 text-xs font-medium",
                      closingDisplay >= openingDisplay ? "text-income" : "text-expense"
                    )}
                  >
                    {closingDisplay >= openingDisplay ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {delta}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Expected income
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xl font-semibold tabular-nums text-income">
                  +{formatCurrency(incomeDisplay, currency)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {forecast.sources.invoiceIncome > 0 &&
                    `incl. ${formatCurrency(convert(forecast.sources.invoiceIncome), currency)} invoices`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Expected expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xl font-semibold tabular-nums text-expense">
                  -{formatCurrency(expenseDisplay, currency)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {forecast.sources.recurringExpenses > 0 &&
                    `incl. ${formatCurrency(convert(forecast.sources.recurringExpenses), currency)} recurring`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Confidence + data warning */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ConfidenceBadge confidence={forecast.confidence} />
            <p className="text-xs text-muted-foreground">{forecast.confidenceReason}</p>
          </div>

          {forecast.dataWarning && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {forecast.dataWarning}
            </div>
          )}

          {/* Chart */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Cash position</CardTitle>
              <p className="text-xs text-muted-foreground">
                Projected balance over the next {horizon} days
              </p>
            </CardHeader>
            <CardContent>
              <ForecastChart
                days={forecast.days}
                openingBalance={openingDisplay}
                currency={currency}
              />
            </CardContent>
          </Card>

          {/* Insights */}
          {forecast.insights.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {forecast.insights.map((insight, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm",
                    insight.severity === "CRITICAL"
                      ? "border-destructive/40 bg-destructive/5 text-foreground"
                      : insight.severity === "WARNING"
                        ? "border-amber-200 bg-amber-50/50 text-foreground dark:border-amber-900/40 dark:bg-amber-900/10"
                        : "border-border bg-secondary/30 text-foreground"
                  )}
                >
                  {insight.severity === "CRITICAL" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : insight.severity === "WARNING" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{insight.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Two-column: Expected income + Expected expenses */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Expected income */}
            <Card>
              <CardHeader>
                <CardTitle>Expected income</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {forecast.items.filter((i) => i.type === "INCOME").length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">
                    No specific income items expected in this period.
                  </p>
                ) : (
                  <ul>
                    {forecast.items
                      .filter((i) => i.type === "INCOME")
                      .slice(0, 8)
                      .map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.date)}
                              <span className="ml-2 capitalize text-muted-foreground/70">
                                {item.source === "INVOICE"
                                  ? "invoice"
                                  : item.source === "PRESET"
                                    ? "recurring"
                                    : "pattern"}
                              </span>
                            </p>
                          </div>
                          <p className="shrink-0 tabular-nums font-medium text-income">
                            +{formatCurrency(convert(item.amount), currency)}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Expected expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Expected expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {forecast.items.filter((i) => i.type === "EXPENSE").length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">
                    No specific expense items expected in this period.
                  </p>
                ) : (
                  <ul>
                    {forecast.items
                      .filter((i) => i.type === "EXPENSE")
                      .slice(0, 8)
                      .map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.date)}
                              <span className="ml-2 capitalize text-muted-foreground/70">
                                {item.source === "PRESET" ? "recurring" : "pattern"}
                              </span>
                            </p>
                          </div>
                          <p className="shrink-0 tabular-nums font-medium text-expense">
                            -{formatCurrency(convert(item.amount), currency)}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Minimum balance + range */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Forecast summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-border/70">
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted-foreground">Opening balance</dt>
                  <dd className="tabular-nums font-medium">{formatCurrency(openingDisplay, currency)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted-foreground">Expected income</dt>
                  <dd className="tabular-nums font-medium text-income">
                    +{formatCurrency(incomeDisplay, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted-foreground">Expected expenses</dt>
                  <dd className="tabular-nums font-medium text-expense">
                    -{formatCurrency(expenseDisplay, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="font-medium">Projected closing</dt>
                  <dd
                    className={cn(
                      "tabular-nums font-semibold",
                      closingDisplay < 0 ? "text-destructive" : ""
                    )}
                  >
                    {formatCurrency(closingDisplay, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted-foreground">Expected range</dt>
                  <dd className="tabular-nums text-muted-foreground">
                    {formatCurrency(rangeLow, currency)} -- {formatCurrency(rangeHigh, currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <dt className="text-muted-foreground">Projected minimum</dt>
                  <dd
                    className={cn(
                      "tabular-nums font-medium",
                      minDisplay < 0 ? "text-destructive" : minDisplay < openingDisplay * 0.2 ? "text-amber-600 dark:text-amber-400" : ""
                    )}
                  >
                    {formatCurrency(minDisplay, currency)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {formatDate(forecast.minimumBalance.date)}
                    </span>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Scenarios */}
          {forecast.scenarios.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Scenarios</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Simple what-if adjustments to the base forecast.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/70">
                  {forecast.scenarios.map((scenario) => (
                    <div key={scenario.scenario} className="px-5 py-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {scenario.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xl font-semibold tabular-nums",
                          scenario.projectedClosingBalance < 0 ? "text-destructive" : ""
                        )}
                      >
                        {formatCurrency(convert(scenario.projectedClosingBalance), currency)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{scenario.description}</p>
                      {scenario.hasProjectedShortfall && (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          Projected shortfall
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day-by-day table */}
          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Day-by-day breakdown</CardTitle>
              <span className="text-xs text-muted-foreground">All amounts in {currency}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-xs text-muted-foreground">
                      <th className="px-5 py-2.5 text-left font-medium">Date</th>
                      <th className="px-4 py-2.5 text-right font-medium">Opening</th>
                      <th className="px-4 py-2.5 text-right font-medium">Income</th>
                      <th className="px-4 py-2.5 text-right font-medium">Expenses</th>
                      <th className="px-4 py-2.5 text-right font-medium">Projected</th>
                      <th className="px-4 py-2.5 text-left font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.days.map((day) => (
                      <tr
                        key={day.date}
                        className={cn(
                          "border-b border-border/50 last:border-b-0",
                          day.projectedBalance < 0 ? "bg-destructive/5" : ""
                        )}
                      >
                        <td className="px-5 py-2.5 tabular-nums">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(convert(day.openingBalance), currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {day.expectedIncome > 0 ? (
                            <span className="text-income">
                              +{formatCurrency(convert(day.expectedIncome), currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">--</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {day.expectedExpenses > 0 ? (
                            <span className="text-expense">
                              -{formatCurrency(convert(day.expectedExpenses), currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">--</span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-right tabular-nums font-medium",
                            day.projectedBalance < 0 ? "text-destructive" : ""
                          )}
                        >
                          {formatCurrency(convert(day.projectedBalance), currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "text-xs",
                              day.confidence === "HIGH"
                                ? "text-muted-foreground/60"
                                : day.confidence === "MEDIUM"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-orange-600 dark:text-orange-400"
                            )}
                          >
                            {day.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

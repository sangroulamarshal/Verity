import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { getDashboardSummary } from "@/server/services/dashboard";
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

  const currency = org?.baseCurrency ?? "GBP";
  const months = summary.monthlyTotals;
  const current = months.at(-1);
  const previous = months.at(-2);

  const incomeChange = current && previous ? percentChange(current.income, previous.income) : null;
  const expenseChange = current && previous ? percentChange(current.expense, previous.expense) : null;
  const netChange =
    current && previous
      ? percentChange(current.income - current.expense, previous.income - previous.expense)
      : null;

  const hasActivity = summary.transactionCount > 0;

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
                  {formatCurrency(summary.totalIncome, currency)}
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
                  {formatCurrency(summary.totalExpense, currency)}
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
                  {formatCurrency(summary.netCashFlow, currency)}
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

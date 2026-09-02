import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  FileText,
  TrendingUp,
  ShieldAlert,
  MoreHorizontal,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { RiskDonutChart } from "@/features/risk/risk-donut-chart";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

function pct(current: number, prev: number) {
  if (prev <= 0) return null;
  return ((current - prev) / prev) * 100;
}

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return null;
  const positive = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[12px] font-medium", positive ? "text-income" : "text-expense")}>
      <Icon className="size-3.5" />
      {Math.abs(value).toFixed(1)}% from last 7 days
    </span>
  );
}

function MetricCard({
  label,
  value,
  delta,
  deltaInverse,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaInverse?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="flex items-start justify-between">
          <p className="text-[12px] text-muted-foreground">{label}</p>
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", iconColor ?? "bg-muted")}>
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
        <p className="mt-2 text-[22px] font-semibold tabular-nums tracking-tight">{value}</p>
        {delta !== undefined && <Delta value={delta ?? null} inverse={deltaInverse} />}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await verifySession();

  const [[org], summary] = await Promise.all([
    db.select({ name: organizations.name, baseCurrency: organizations.baseCurrency })
      .from(organizations).where(eq(organizations.id, session.organizationId)).limit(1),
    getDashboardSummary(session.organizationId),
  ]);

  const riskSummary = await getRiskSummary(session.organizationId);
  const forecastSummary = await getForecastSummary(session.organizationId, 30).catch(() => null);

  const baseCurrency = org?.baseCurrency ?? "GBP";
  const { summary: disp, currency, rateUnavailable } = await resolveDisplaySummary(
    summary, baseCurrency, session.displayCurrency ?? baseCurrency
  );

  const months = disp.monthlyTotals;
  const cur = months.at(-1);
  const prev = months.at(-2);
  const incomeChg = cur && prev ? pct(cur.income, prev.income) : null;
  const expChg = cur && prev ? pct(cur.expense, prev.expense) : null;
  const netChg = cur && prev ? pct(cur.income - cur.expense, prev.income - prev.expense) : null;

  const hasActivity = disp.transactionCount > 0;

  const riskTotal =
    (riskSummary.counts.CRITICAL ?? 0) +
    (riskSummary.counts.HIGH ?? 0) +
    (riskSummary.counts.MEDIUM ?? 0) +
    (riskSummary.counts.LOW ?? 0);

  const riskSegments = [
    { value: riskSummary.counts.CRITICAL ?? 0, color: "#dc2626", label: "Critical" },
    { value: riskSummary.counts.HIGH ?? 0,     color: "#ea580c", label: "High" },
    { value: riskSummary.counts.MEDIUM ?? 0,   color: "#d97706", label: "Medium" },
    { value: riskSummary.counts.LOW ?? 0,      color: "#16a34a", label: "Low" },

  ].filter((s) => s.value > 0);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Overview</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Real-time overview of your financial activity and risk exposure.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/transactions">
            + Add Transaction
          </Link>
        </Button>
      </div>

      {rateUnavailable && (
        <div className="mb-4 rounded-md border border-border bg-elevated px-4 py-2.5 text-[12px] text-muted-foreground">
          Showing totals in {baseCurrency} -- exchange rate to {session.displayCurrency} unavailable.
        </div>
      )}

      {!hasActivity ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[14px] font-medium">No financial activity yet</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Add your first transaction or import a statement to see revenue, expenses, and cash flow.
            </p>
            <div className="mt-1 flex gap-2">
              <Button asChild size="sm"><Link href="/transactions">Add transaction</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/imports">Import statement</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Total Income" value={formatCurrency(disp.totalIncome, currency)} delta={incomeChg} icon={TrendingUp} iconColor="bg-income/15" />
            <MetricCard label="Total Expenses" value={formatCurrency(disp.totalExpense, currency)} delta={expChg} deltaInverse icon={ArrowDownRight} iconColor="bg-expense/15" />
            <MetricCard label="Net Cash Flow" value={formatCurrency(disp.netCashFlow, currency)} delta={netChg} icon={TrendingUp} iconColor="bg-primary/15" />
            <MetricCard label="Transactions" value={disp.transactionCount.toLocaleString()} icon={FileText} iconColor="bg-muted" />
            <MetricCard label="Risk Alerts" value={String(riskSummary.requiringReview)} icon={ShieldAlert} iconColor="bg-risk-critical/15" />
          </div>

          {/* Two-column charts row */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Cash flow chart - 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between pb-0">
                <CardTitle>Cash Flow Trend</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Last 7 days</span>
                  <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated">
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <CashFlowChart data={months} />
              </CardContent>
            </Card>

            {/* Risk overview - 1/3 — donut chart replaces progress bars */}
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-0">
                <CardTitle>Risk Overview</CardTitle>
                <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated">
                  <MoreHorizontal className="size-4" />
                </button>
              </CardHeader>
              <CardContent className="pt-3">
                {riskSummary.totalAnalyzed === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No transactions evaluated yet.</p>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <RiskDonutChart total={riskTotal} segments={riskSegments} />
                    <Link href="/risk" className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
                      View all risk alerts <ArrowRight className="size-3" />
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Two-column tables row */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Recent transactions - 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Link href="/transactions" className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
                  View all <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Date</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Description</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Category</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Amount</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Risk</th>
                      <th className="px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentTransactions.map((t) => (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                        <td className="px-5 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-3 py-2.5 max-w-[180px] truncate">
                          {t.description || <span className="text-muted-foreground">{t.category}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{t.category}</td>
                        <td className={cn("px-3 py-2.5 text-right tabular-nums font-medium", t.type === "INCOME" ? "text-income" : "text-expense")}>
                          {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                        </td>
                        <td className="px-3 py-2.5">
                          {t.riskLevel ? (
                            <Badge variant={`risk-${t.riskLevel.toLowerCase()}` as "risk-low"}>
                              {t.riskLevel.charAt(0) + t.riskLevel.slice(1).toLowerCase()}
                            </Badge>
                          ) : <span className="text-muted-foreground/40">--</span>}
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge variant="secondary">Completed</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border px-5 py-2.5">
                <Link href="/transactions" className="text-[12px] text-primary hover:underline">
                  View all transactions &rarr;
                </Link>
              </div>
            </Card>

            {/* Recent risk alerts - 1/3 */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent Risk Alerts</CardTitle>
                <Link href="/risk" className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
                  View all <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <div className="divide-y divide-border/50">
                {riskSummary.totalAnalyzed === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No risk alerts yet.</p>
                ) : (
                  summary.recentTransactions
                    .filter((t) => t.riskLevel && t.riskLevel !== "LOW")
                    .slice(0, 5)
                    .map((t) => {
                      const lvlColor = {
                        CRITICAL: "text-risk-critical",
                        HIGH: "text-risk-high",
                        MEDIUM: "text-risk-medium",
                        LOW: "text-risk-low",
                      }[t.riskLevel ?? "LOW"] ?? "text-muted-foreground";
                      return (
                        <div key={t.id} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-elevated/30 transition-colors">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">{formatCurrency(t.baseAmount, baseCurrency)}</p>
                            <p className="text-[11px] text-muted-foreground">{t.category}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {t.riskLevel && (
                              <span className={cn("text-[11px] font-medium", lvlColor)}>
                                {t.riskLevel.charAt(0) + t.riskLevel.slice(1).toLowerCase()}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">{formatDate(t.date)}</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
              {riskSummary.totalAnalyzed > 0 && (
                <div className="border-t border-border px-5 py-2.5">
                  <Link href="/risk" className="text-[12px] text-primary hover:underline">
                    View all alerts &rarr;
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Forecast strip */}
          {forecastSummary && forecastSummary.confidence !== "INSUFFICIENT" && (
            <Card className="mt-4">
              <CardContent className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:gap-10">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Current cash</p>
                  <p className="mt-0.5 text-[18px] font-semibold tabular-nums">
                    {formatCurrency(forecastSummary.currentBalance, forecastSummary.baseCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">30-day projected</p>
                  <p className={cn("mt-0.5 text-[18px] font-semibold tabular-nums", forecastSummary.projectedBalance < 0 ? "text-expense" : "")}>
                    {formatCurrency(forecastSummary.projectedBalance, forecastSummary.baseCurrency)}
                  </p>
                </div>
                {forecastSummary.hasProjectedShortfall && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5">
                    <p className="text-[12px] font-medium text-destructive">Projected shortfall {forecastSummary.minimumBalance.date}</p>
                  </div>
                )}
                <div className="sm:ml-auto flex items-center gap-3">
                  <Badge variant={forecastSummary.confidence === "HIGH" ? "success" : forecastSummary.confidence === "MEDIUM" ? "warning" : "secondary"}>
                    {forecastSummary.confidence === "HIGH" ? "High confidence" : forecastSummary.confidence === "MEDIUM" ? "Medium confidence" : "Low confidence"}
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/cashflow">View forecast</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}


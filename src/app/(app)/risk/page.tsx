import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ShieldCheck, MoreHorizontal, Search } from "lucide-react";
import { verifySession } from "@/server/services/session";
import {
  getRiskSummary, getRecentAnomalies, listRiskTransactions,
  type RiskLevel, type RiskStatus,
} from "@/server/services/risk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskDonutChart } from "@/features/risk/risk-donut-chart";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Risk" };

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: RiskStatus[] = ["UNREVIEWED", "REVIEWED", "DISMISSED"];

const LEVEL_COLORS = {
  CRITICAL: { badge: "risk-critical" as const, icon: "text-risk-critical", bg: "bg-risk-critical/15" },
  HIGH:     { badge: "risk-high" as const,     icon: "text-risk-high",     bg: "bg-risk-high/15" },
  MEDIUM:   { badge: "risk-medium" as const,   icon: "text-risk-medium",   bg: "bg-risk-medium/15" },
  LOW:      { badge: "risk-low" as const,      icon: "text-risk-low",      bg: "bg-risk-low/15" },
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "success" | "outline" }> = {
  UNREVIEWED: { label: "New", variant: "secondary" },
  REVIEWED:   { label: "Reviewed", variant: "success" },
  DISMISSED:  { label: "Dismissed", variant: "outline" },
};

export default async function RiskPage(props: PageProps<"/risk">) {
  const session = await verifySession();
  const searchParams = await props.searchParams;

  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const levelParam = firstParam(searchParams.level);
  const statusParam = firstParam(searchParams.status);
  const level = LEVELS.includes(levelParam as RiskLevel) ? (levelParam as RiskLevel) : undefined;
  const status = STATUSES.includes(statusParam as RiskStatus) ? (statusParam as RiskStatus) : undefined;

  const [summary, recentAnomalies, table] = await Promise.all([
    getRiskSummary(session.organizationId),
    getRecentAnomalies(session.organizationId),
    listRiskTransactions(session.organizationId, {
      page, level, status,
      search: firstParam(searchParams.search),
    }),
  ]);

  const hasAny = summary.totalAnalyzed > 0;

  const riskTotal =
    (summary.counts.CRITICAL ?? 0) +
    (summary.counts.HIGH ?? 0) +
    (summary.counts.MEDIUM ?? 0) +
    (summary.counts.LOW ?? 0) +
    (summary.counts.INFO ?? 0);

  const riskSegments = [
    { value: summary.counts.CRITICAL ?? 0, color: "#dc2626", label: "Critical" },
    { value: summary.counts.HIGH ?? 0,     color: "#ea580c", label: "High" },
    { value: summary.counts.MEDIUM ?? 0,   color: "#d97706", label: "Medium" },
    { value: summary.counts.LOW ?? 0,      color: "#16a34a", label: "Low" },
    { value: summary.counts.INFO ?? 0,     color: "#6b7280", label: "Reviewed" },
  ].filter((s) => s.value > 0);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Risk</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Monitor unusual financial activity and investigate potential anomalies.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <ShieldAlert className="mr-1.5 size-3.5" /> Risk Settings
        </Button>
      </div>

      {!hasAny ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/40" />
            <p className="text-[14px] font-medium">No transactions evaluated yet</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Transactions are evaluated automatically as they are created or imported.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 6 metric cards */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((lvl) => {
              const col = LEVEL_COLORS[lvl];
              return (
                <Card key={lvl}>
                  <CardContent className="px-4 py-3.5">
                    <div className="flex items-start justify-between">
                      <p className="text-[12px] text-muted-foreground">{lvl.charAt(0) + lvl.slice(1).toLowerCase()}</p>
                      <div className={cn("flex size-7 items-center justify-center rounded-md", col.bg)}>
                        <ShieldAlert className={cn("size-3.5", col.icon)} />
                      </div>
                    </div>
                    <p className="mt-2 text-[22px] font-semibold tabular-nums">{summary.counts[lvl]}</p>
                    <p className="text-[11px] text-muted-foreground">0 from last 7 days</p>
                  </CardContent>
                </Card>
              );
            })}
            <Card>
              <CardContent className="px-4 py-3.5">
                <div className="flex items-start justify-between">
                  <p className="text-[12px] text-muted-foreground">Reviewed</p>
                  <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                    <ShieldCheck className="size-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="mt-2 text-[22px] font-semibold tabular-nums">
                  {summary.totalAnalyzed - summary.requiringReview}
                </p>
                <p className="text-[11px] text-muted-foreground">0 from last 7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-3.5">
                <p className="text-[12px] text-muted-foreground">Risk Score (Avg)</p>
                <p className="mt-2 text-[22px] font-semibold tabular-nums text-muted-foreground">--</p>
                <p className="text-[11px] text-muted-foreground">0 from last 7 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Two-column: donut chart + recent alerts */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Risk Breakdown donut — replaces placeholder trend chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between pb-0">
                <CardTitle>Risk Breakdown</CardTitle>
                <div className="flex items-center gap-2">
                  <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated">
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center">
                <RiskDonutChart total={riskTotal} segments={riskSegments} />
              </CardContent>
            </Card>

            {/* Recent alerts sidebar */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent Risk Alerts</CardTitle>
                <Link href="/risk" className="text-[12px] text-primary hover:underline">View all &rarr;</Link>
              </CardHeader>
              <div className="divide-y divide-border/50">
                {recentAnomalies.slice(0, 5).map((a) => {
                  const col = LEVEL_COLORS[a.level] ?? LEVEL_COLORS.LOW;
                  return (
                    <Link
                      key={a.transactionId}
                      href={`/risk/${a.transactionId}`}
                      className="flex items-start justify-between gap-2 px-5 py-3 hover:bg-elevated/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] font-medium">{a.transactionId.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[11px] text-muted-foreground">{a.topSignal ?? "Risk event"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn("text-[11px] font-medium", col.icon)}>
                          {a.level.charAt(0) + a.level.slice(1).toLowerCase()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{a.score}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-border px-5 py-2.5">
                <Link href="/risk" className="text-[12px] text-primary hover:underline">View all risk alerts &rarr;</Link>
              </div>
            </Card>
          </div>

          {/* Main risk table */}
          <div className="mt-4 rounded-[6px] border border-border bg-surface overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-border px-4 pt-1">
              {["All Alerts", "Critical", "High", "Medium", "Low", "Reviewed"].map((tab, i) => {
                const isActive = i === 0 && !level && !status;
                return (
                  <Link
                    key={tab}
                    href={`/risk${i === 0 ? "" : i === 5 ? "?status=REVIEWED" : `?level=${tab.toUpperCase()}`}`}
                    className={cn(
                      "relative pb-2.5 pt-2 px-3 text-[13px] font-medium transition-colors",
                      isActive ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </Link>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2 rounded-md border border-border bg-elevated/30 px-2.5 py-1.5 text-[12px] text-muted-foreground/50 flex-1 max-w-xs">
                <Search className="size-3.5" />
                <span>Search risk alerts...</span>
              </div>
              <Button variant="outline" size="sm">Risk Level</Button>
              <Button variant="outline" size="sm">Category</Button>
              <Button variant="outline" size="sm">Status</Button>
              <Button variant="outline" size="sm">Date Range</Button>
              <div className="ml-auto">
                <Button variant="outline" size="sm">Export</Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead className="border-b border-border bg-elevated/20">
                  <tr>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Transaction</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Description</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Amount</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Customer</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Category</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Risk Score</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Risk Level</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Confidence</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Date</th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                        No flagged transactions match the current filters.
                      </td>
                    </tr>
                  ) : (
                    table.rows.map((row) => {
                      const lvl = (row.riskLevel ?? "LOW") as RiskLevel;
                      const col = LEVEL_COLORS[lvl];
                      const statusInfo = STATUS_LABELS[row.riskStatus ?? "UNREVIEWED"] ?? STATUS_LABELS.UNREVIEWED;
                      return (
                        <tr key={row.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                          <td className="px-5 py-2.5">
                            <Link href={`/risk/${row.id}`} className="font-mono text-[12px] text-primary hover:underline">
                              {row.id.slice(0, 8).toUpperCase()}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 max-w-[180px]">
                            <span className="truncate block">{row.description || row.category}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-expense">
                            {formatCurrency(row.amount, row.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {row.counterparty ?? "--"}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.category}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-mono text-[12px]">
                            {row.riskScore ?? "--"}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={col.badge}>
                              {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right text-[12px] text-muted-foreground">
                            --
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatDate(row.date)}
                          </td>
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/risk/${row.id}`}
                              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground"
                            >
                              <MoreHorizontal className="size-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
              <span className="text-[12px] text-muted-foreground">
                Showing {table.rows.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, table.total)} of {table.total} results
              </span>
              {table.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].filter(p => p <= table.totalPages).map((p) => (
                    <Button key={p} asChild={p !== page} variant={p === page ? "default" : "ghost"} size="sm">
                      {p === page ? <span>{p}</span> : <Link href={`/risk?page=${p}`}>{p}</Link>}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

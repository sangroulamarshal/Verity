import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/server/services/session";
import {
  getRiskSummary,
  getRecentAnomalies,
  listRiskTransactions,
  type RiskLevel,
  type RiskStatus,
} from "@/server/services/risk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskTable } from "@/features/risk/risk-table";
import { RiskFilters } from "@/features/risk/risk-filters";
import { RiskLevelBadge } from "@/features/risk/risk-badge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Risk",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: RiskStatus[] = ["UNREVIEWED", "REVIEWED", "DISMISSED"];

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
      page,
      level,
      status,
      search: firstParam(searchParams.search),
    }),
  ]);

  const hasAnyEvaluated = summary.totalAnalyzed > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Risk</h1>
        <p className="text-sm text-muted-foreground">
          Deterministic, rule-based flags for unusual or suspicious transactions — not a fraud
          determination. Every score comes with the specific signals that produced it.
        </p>
      </div>

      {!hasAnyEvaluated ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium">No transactions have been evaluated yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              New transactions are evaluated automatically as they&apos;re created or imported.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {LEVELS.map((lvl) => (
              <Card key={lvl}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    <RiskLevelBadge level={lvl} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-2xl font-semibold tabular-nums">{summary.counts[lvl]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Transactions analyzed
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold tabular-nums">{summary.totalAnalyzed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Requiring review
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold tabular-nums">{summary.requiringReview}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Critical
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-semibold tabular-nums">{summary.counts.CRITICAL}</p>
              </CardContent>
            </Card>
          </div>

          {recentAnomalies.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recent anomalies</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul>
                  {recentAnomalies.map((a) => (
                    <li key={`${a.transactionId}-${a.createdAt.toISOString()}`}>
                      <Link
                        href={`/risk/${a.transactionId}`}
                        className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-b-0 hover:bg-secondary/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{a.topSignal ?? "Flagged transaction"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(a.createdAt.toISOString())}</p>
                        </div>
                        <RiskLevelBadge level={a.level} className="shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="mt-4">
            <RiskFilters />
            <RiskTable rows={table.rows} />
            {table.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-4 text-sm text-muted-foreground">
                <span>
                  Page {table.page} of {table.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" disabled={table.page <= 1}>
                    <Link
                      href={`/risk?page=${table.page - 1}${level ? `&level=${level}` : ""}${status ? `&status=${status}` : ""}`}
                    >
                      Previous
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" disabled={table.page >= table.totalPages}>
                    <Link
                      href={`/risk?page=${table.page + 1}${level ? `&level=${level}` : ""}${status ? `&status=${status}` : ""}`}
                    >
                      Next
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

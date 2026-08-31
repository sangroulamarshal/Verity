import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { getTransactionById } from "@/server/services/transactions";
import { getRiskHistoryForTransaction } from "@/server/services/risk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskLevelBadge } from "@/features/risk/risk-badge";
import { RiskReviewButtons } from "@/features/risk/risk-review-buttons";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Risk detail" };

export default async function RiskDetailPage(props: PageProps<"/risk/[transactionId]">) {
  const session = await verifySession();
  const { transactionId } = await props.params;

  const [transaction, history] = await Promise.all([
    getTransactionById(session.organizationId, transactionId),
    getRiskHistoryForTransaction(session.organizationId, transactionId),
  ]);

  if (!transaction || history.length === 0) notFound();

  const latest = history[0];
  const previous = history[1];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/risk">&larr; Back to Risk</Link>
      </Button>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{transaction.description || transaction.category}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(transaction.date)} · {transaction.counterparty ?? "No counterparty"}
            </p>
          </div>
          <p
            className={
              "shrink-0 tabular-nums text-lg font-semibold " +
              (transaction.type === "INCOME" ? "text-income" : "text-expense")
            }
          >
            {transaction.type === "INCOME" ? "+" : "\u2212"}
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-semibold tabular-nums">{latest.score}</p>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <RiskLevelBadge level={latest.level} />
            {previous && previous.level !== latest.level && (
              <span className="text-xs text-muted-foreground">
                (was {previous.score} &mdash; {previous.level})
              </span>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Why</p>
            {latest.signals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No individual signals fired.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {latest.signals
                  .slice()
                  .sort((a, b) => b.points - a.points)
                  .map((signal, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <span>{signal.explanation}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">+{signal.points}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <RiskReviewButtons transactionId={transaction.id} status={latest.status} />
        </CardContent>
      </Card>

      {history.length > 1 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <p>{formatDate(entry.createdAt.toISOString())}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.status === "UNREVIEWED"
                        ? "Not yet reviewed"
                        : `${entry.status === "REVIEWED" ? "Reviewed" : "Dismissed"}${
                            entry.reviewedAt ? ` \u00b7 ${formatDate(entry.reviewedAt.toISOString())}` : ""
                          }`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{entry.score}</span>
                    <RiskLevelBadge level={entry.level} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

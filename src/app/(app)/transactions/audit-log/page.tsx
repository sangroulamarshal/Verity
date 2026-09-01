import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { verifySession } from "@/server/services/session";
import { listAuditLog, type AuditAction } from "@/server/services/audit-log";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionTabs } from "@/features/transactions/transaction-tabs";
import { AuditLogFilters } from "@/features/transactions/audit-log/audit-log-filters";

export const metadata: Metadata = { title: "Audit Log" };

const TRANSACTION_ACTIONS: AuditAction[] = [
  "TRANSACTION_CREATED", "TRANSACTION_UPDATED", "TRANSACTION_DELETED",
];

const ACTION_LABELS: Record<string, string> = {
  TRANSACTION_CREATED: "Created transaction",
  TRANSACTION_UPDATED: "Edited transaction",
  TRANSACTION_DELETED: "Deleted transaction",
  TRANSACTION_PRESET_CREATED: "Created preset",
  TRANSACTION_PRESET_UPDATED: "Edited preset",
  TRANSACTION_PRESET_DELETED: "Deleted preset",
};

const ACTION_VARIANTS: Record<string, "success" | "warning" | "expense" | "secondary"> = {
  TRANSACTION_CREATED: "success",
  TRANSACTION_UPDATED: "warning",
  TRANSACTION_DELETED: "expense",
  TRANSACTION_PRESET_CREATED: "success",
  TRANSACTION_PRESET_UPDATED: "warning",
  TRANSACTION_PRESET_DELETED: "expense",
};

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AuditLogPage(props: PageProps<"/transactions/audit-log">) {
  const session = await verifySession();
  const searchParams = await props.searchParams;

  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const actionParam = firstParam(searchParams.action);
  const action = TRANSACTION_ACTIONS.includes(actionParam as AuditAction)
    ? (actionParam as AuditAction)
    : undefined;

  const { rows, total, totalPages } = await listAuditLog(session.organizationId, {
    entityType: "transaction",
    action,
    dateFrom: firstParam(searchParams.dateFrom),
    dateTo: firstParam(searchParams.dateTo),
    page,
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Audit Log</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Track important changes and activity across your organization.
          </p>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <TransactionTabs />
        <AuditLogFilters />

        {/* Dense table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Timestamp</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">User</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Action</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Resource</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-8 text-muted-foreground/30" />
                      <p className="text-[13px] font-medium">No activity recorded</p>
                      <p className="text-[12px] text-muted-foreground">Changes to transactions will appear here automatically.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((entry) => {
                  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action.replaceAll("_", " ").toLowerCase();
                  const actionVariant = ACTION_VARIANTS[entry.action] ?? "secondary";
                  const meta = entry.metadata as Record<string, unknown> | null;
                  const description = meta?.description ?? meta?.category ?? null;
                  return (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                      <td className="px-5 py-2.5 tabular-nums text-[12px] text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 max-w-[160px]">
                        <span className="truncate block text-[12px]">{entry.userEmail ?? "Unknown"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={actionVariant}>{actionLabel}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.entityId ? (
                          <Link
                            href={`/transactions?transactionId=${entry.entityId}`}
                            className="font-mono text-[11px] text-primary hover:underline"
                          >
                            #{entry.entityId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/40">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 max-w-[280px]">
                        <span className="truncate block text-[12px] text-muted-foreground">
                          {description ? String(description) : "--"}
                        </span>
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
            {total} recorded {total === 1 ? "change" : "changes"} to transactions.
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/transactions/audit-log?page=${page - 1}${action ? `&action=${action}` : ""}`}>&larr;</Link>
                </Button>
              )}
              {[1, 2, 3, 4, 5].filter(p => p <= totalPages).map((p) => (
                <Button key={p} asChild={p !== page} variant={p === page ? "default" : "ghost"} size="sm">
                  {p === page ? <span>{String(p)}</span> : <Link href={`/transactions/audit-log?page=${p}${action ? `&action=${action}` : ""}`}>{p}</Link>}
                </Button>
              ))}
              {page < totalPages && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/transactions/audit-log?page=${page + 1}${action ? `&action=${action}` : ""}`}>&rarr;</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

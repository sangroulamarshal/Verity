import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/server/services/session";
import { listAuditLog, type AuditAction } from "@/server/services/audit-log";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionTabs } from "@/features/transactions/transaction-tabs";
import { AuditLogFilters } from "@/features/transactions/audit-log/audit-log-filters";
import { AuditLogList } from "@/features/transactions/audit-log/audit-log-list";

export const metadata: Metadata = {
  title: "Audit Log",
};

const TRANSACTION_ACTIONS: AuditAction[] = [
  "TRANSACTION_CREATED",
  "TRANSACTION_UPDATED",
  "TRANSACTION_DELETED",
];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          {total} recorded change{total === 1 ? "" : "s"} to transactions. Nothing here is ever
          deleted or overwritten.
        </p>
      </div>

      <Card className="overflow-hidden py-0">
        <TransactionTabs />
        <AuditLogFilters />
        <CardContent className="p-0">
          <AuditLogList entries={rows} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions/audit-log?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions/audit-log?page=${page + 1}`}>Next</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

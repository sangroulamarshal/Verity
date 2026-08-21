import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/server/services/session";
import { listTransactions } from "@/server/services/transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionDialog } from "@/features/transactions/transaction-dialog";
import { TransactionsTable } from "@/features/transactions/transactions-table";

export const metadata: Metadata = {
  title: "Transactions — Verity",
};

export default async function TransactionsPage(props: PageProps<"/transactions">) {
  const session = await verifySession();
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const { rows, total, totalPages } = await listTransactions(session.organizationId, {
    page,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {total} transaction{total === 1 ? "" : "s"} recorded.
          </p>
        </div>
        <TransactionDialog
          mode="create"
          trigger={<Button type="button">New transaction</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <TransactionsTable transactions={rows} />
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
                <Link href={`/transactions?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions?page=${page + 1}`}>Next</Link>
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

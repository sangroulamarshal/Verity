import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { listTransactions } from "@/server/services/transactions";
import { getOrganization } from "@/server/services/organizations";
import { getUserById } from "@/server/services/account";
import { preferencesSchema, DEFAULT_PREFERENCES } from "@/features/settings/preferences/schema";
import { withDisplayAmounts } from "@/features/transactions/display-currency";
import { canWriteTransactions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionDialog } from "@/features/transactions/transaction-dialog";
import { TransactionsTable } from "@/features/transactions/transactions-table";
import { TransactionTabs } from "@/features/transactions/transaction-tabs";
import { TransactionFilters } from "@/features/transactions/transaction-filters";

export const metadata: Metadata = {
  title: "Transactions",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage(props: PageProps<"/transactions">) {
  const session = await verifySession();
  const searchParams = await props.searchParams;

  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const type = firstParam(searchParams.type);

  // getUserById and getOrganization are independent reads (one keyed on
  // session.userId, the other on session.organizationId) that were
  // previously awaited one after another — a needless extra DB round
  // trip on every single transactions-page load. Neither depends on the
  // other's result, so they run concurrently.
  const [user, organization] = await Promise.all([
    getUserById(session.userId),
    getOrganization(session.organizationId),
  ]);
  const parsedPrefs = preferencesSchema.safeParse(user?.preferences ?? {});
  const preferences = parsedPrefs.success ? parsedPrefs.data : DEFAULT_PREFERENCES;

  // No explicit `type`/`search`/filter in the URL yet — apply the
  // person's "default transaction view" preference (brief section 39) by
  // redirecting once, so the tab that opens matches what they asked for
  // without silently filtering behind their back on every visit.
  if (type === undefined && Object.keys(searchParams).length === 0 && preferences.defaultTransactionView !== "ALL") {
    redirect(`/transactions?type=${preferences.defaultTransactionView}`);
  }

  const typeFilter = type === "INCOME" || type === "EXPENSE" ? type : undefined;
  const canEdit = canWriteTransactions(session.role);
  const displayCurrency = session.displayCurrency ?? organization?.baseCurrency ?? "GBP";

  const { rows, total, totalPages } = await listTransactions(session.organizationId, {
    page,
    type: typeFilter,
    search: firstParam(searchParams.search),
    currency: firstParam(searchParams.currency),
    paymentMethod: firstParam(searchParams.paymentMethod),
    dateFrom: firstParam(searchParams.dateFrom),
    dateTo: firstParam(searchParams.dateTo),
  });

  const rowsWithDisplay = await withDisplayAmounts(rows, displayCurrency);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {total} transaction{total === 1 ? "" : "s"} recorded.
          </p>
        </div>
        {canEdit && (
          <TransactionDialog
            mode="create"
            trigger={<Button type="button">New transaction</Button>}
          />
        )}
      </div>

      <Card className="overflow-hidden py-0">
        <TransactionTabs />
        <TransactionFilters />
        <CardContent className="p-0">
          <TransactionsTable
            transactions={rowsWithDisplay}
            canEdit={canEdit}
            dateFormat={preferences.dateFormat}
          />
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
                <Link href={`/transactions?page=${page - 1}${type ? `&type=${type}` : ""}`}>
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/transactions?page=${page + 1}${type ? `&type=${type}` : ""}`}>
                  Next
                </Link>
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

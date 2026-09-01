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
import { Badge } from "@/components/ui/badge";
import { TransactionDialog } from "@/features/transactions/transaction-dialog";
import { TransactionTabs } from "@/features/transactions/transaction-tabs";
import { TransactionFilters } from "@/features/transactions/transaction-filters";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transactions" };

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual", CSV: "CSV", EXCEL: "Excel",
};

export default async function TransactionsPage(props: PageProps<"/transactions">) {
  const session = await verifySession();
  const searchParams = await props.searchParams;

  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const type = firstParam(searchParams.type);

  const [user, organization] = await Promise.all([
    getUserById(session.userId),
    getOrganization(session.organizationId),
  ]);
  const parsedPrefs = preferencesSchema.safeParse(user?.preferences ?? {});
  const preferences = parsedPrefs.success ? parsedPrefs.data : DEFAULT_PREFERENCES;

  if (type === undefined && Object.keys(searchParams).length === 0 && preferences.defaultTransactionView !== "ALL") {
    redirect(`/transactions?type=${preferences.defaultTransactionView}`);
  }

  const typeFilter = type === "INCOME" || type === "EXPENSE" ? type : undefined;
  const canEdit = canWriteTransactions(session.role);
  const displayCurrency = session.displayCurrency ?? organization?.baseCurrency ?? "GBP";

  const { rows, total, totalPages } = await listTransactions(session.organizationId, {
    page, type: typeFilter,
    search: firstParam(searchParams.search),
    transactionId: firstParam(searchParams.transactionId),
    customerId: firstParam(searchParams.customerId),
    currency: firstParam(searchParams.currency),
    paymentMethod: firstParam(searchParams.paymentMethod),
    dateFrom: firstParam(searchParams.dateFrom),
    dateTo: firstParam(searchParams.dateTo),
  });

  const rowsWithDisplay = await withDisplayAmounts(rows, displayCurrency);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">All Transactions</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Monitor and manage all financial activity across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export</Button>
          {canEdit && (
            <TransactionDialog mode="create" trigger={<Button size="sm">+ Add Transaction</Button>} />
          )}
        </div>
      </div>

      {/* Tabs + Filters in one surface */}
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <TransactionTabs />
        <TransactionFilters />

        {/* Dense table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Date</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Description</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Customer</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Category</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Type</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Amount</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Currency</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Risk</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Status</th>
                {canEdit && <th className="w-10 px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {rowsWithDisplay.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                    No transactions found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                rowsWithDisplay.map((t) => {
                  const isIncome = t.type === "INCOME";
                  const riskVariant = t.riskLevel
                    ? `risk-${t.riskLevel.toLowerCase()}` as "risk-low"
                    : null;
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                      <td className="px-5 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDate(t.date, preferences.dateFormat)}
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <span className="truncate block">
                          {t.description || <span className="text-muted-foreground/60">{t.category}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[140px] text-muted-foreground">
                        <span className="truncate block">{t.counterparty ?? "--"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{t.category}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={isIncome ? "income" : "expense"}>
                          {isIncome ? "Income" : "Expense"}
                        </Badge>
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-medium", isIncome ? "text-income" : "text-expense")}>
                        {isIncome ? "+" : "-"}{formatCurrency(t.amount, t.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-[12px]">{t.currency}</td>
                      <td className="px-4 py-2.5">
                        {riskVariant ? (
                          <Badge variant={riskVariant}>
                            {t.riskLevel!.charAt(0) + t.riskLevel!.slice(1).toLowerCase()}
                          </Badge>
                        ) : <span className="text-muted-foreground/30">--</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary">Completed</Badge>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <TransactionDialog
                              mode="edit"
                              transactionId={t.id}
                              defaultValues={{
                                date: t.date, amount: String(t.amount),
                                currency: t.currency, type: t.type,
                                category: t.category, description: t.description ?? "",
                                counterparty: t.counterparty ?? "", referenceId: t.referenceId ?? "",
                                paymentMethod: t.paymentMethod ?? "",
                              }}
                              trigger={
                                <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground">
                                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                                </button>
                              }
                            />
                          </div>
                        </td>
                      )}
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
            Showing {rowsWithDisplay.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, total)} of {total} results
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/transactions?page=${page - 1}${type ? `&type=${type}` : ""}`}>&larr;</Link>
                </Button>
              )}
              {[1, 2, 3, 4, 5].filter(p => p <= totalPages).map((p) => (
                <Button key={p} asChild={p !== page} variant={p === page ? "default" : "ghost"} size="sm">
                  {p === page ? <span>{String(p)}</span> : <Link href={`/transactions?page=${p}${type ? `&type=${type}` : ""}`}>{p}</Link>}
                </Button>
              ))}
              {totalPages > 5 && <span className="px-1 text-muted-foreground text-[12px]">...</span>}
              {totalPages > 5 && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/transactions?page=${totalPages}${type ? `&type=${type}` : ""}`}>{totalPages}</Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/transactions?page=${page + 1}${type ? `&type=${type}` : ""}`}>&rarr;</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

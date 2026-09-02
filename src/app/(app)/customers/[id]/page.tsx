import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { getCustomerById, getCustomerSummary } from "@/server/services/customers";
import { listTransactions } from "@/server/services/transactions";
import { getOrganization } from "@/server/services/organizations";
import { canWriteCustomers } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerDialog } from "@/features/customers/customer-dialog";
import { DeleteCustomerButtonWithRedirect } from "@/features/customers/delete-customer-button-with-redirect";

export async function generateMetadata(props: PageProps<"/customers/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const session = await verifySession();
  const customer = await getCustomerById(session.organizationId, id);
  return { title: customer ? customer.name : "Customer" };
}

export default async function CustomerDetailPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  const session = await verifySession();

  const [customer, organization] = await Promise.all([
    getCustomerById(session.organizationId, id),
    getOrganization(session.organizationId),
  ]);

  // Generic 404 rather than distinguishing "doesn't exist" from
  // "belongs to another organization" — getCustomerById already returns
  // null for both, same rationale as every other org-scoped lookup in
  // this codebase (see server/services/transactions.ts's comment).
  if (!customer) notFound();

  const baseCurrency = organization?.baseCurrency ?? "GBP";
  const canEdit = canWriteCustomers(session.role);

  const [summary, { rows: transactions, total: transactionTotal }] = await Promise.all([
    getCustomerSummary(session.organizationId, id),
    listTransactions(session.organizationId, { customerId: id, pageSize: 10 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
            &larr; Customers
          </Link>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">{customer.name}</h1>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <CustomerDialog
              mode="edit"
              customerId={customer.id}
              defaultValues={{
                name: customer.name,
                email: customer.email ?? undefined,
                phone: customer.phone ?? undefined,
                notes: customer.notes ?? undefined,
              }}
              trigger={<Button type="button" variant="outline">Edit</Button>}
            />
            <DeleteCustomerButtonWithRedirect id={customer.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>{customer.email ?? "No email on file"}</p>
            <p>{customer.phone ?? "No phone on file"}</p>
            {customer.notes && (
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{customer.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime totals ({baseCurrency})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              Income:{" "}
              <span className="font-medium text-income">
                {formatCurrency(summary.totalIncome, baseCurrency)}
              </span>
            </p>
            <p>
              Expense:{" "}
              <span className="font-medium text-expense">
                {formatCurrency(summary.totalExpense, baseCurrency)}
              </span>
            </p>
            <p>
              Net:{" "}
              <span className="font-medium">{formatCurrency(summary.netCashFlow, baseCurrency)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground">
              {summary.lastTransactionDate
                ? `Last activity ${formatDate(summary.lastTransactionDate)}`
                : "No activity yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm font-medium">Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No transactions linked to this customer yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="text-muted-foreground">{transaction.category}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.type === "INCOME" ? "Income" : "Expense"}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          transaction.type === "INCOME" ? "text-income" : "text-expense"
                        }`}
                      >
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {transactionTotal > transactions.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          Showing the {transactions.length} most recent of {transactionTotal} —{" "}
          <Link
            href={`/transactions?customerId=${customer.id}`}
            className="text-primary hover:underline"
          >
            view all in Transactions
          </Link>
          .
        </p>
      )}
    </div>
  );
}

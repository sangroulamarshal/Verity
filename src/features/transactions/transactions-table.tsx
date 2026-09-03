import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type PAYMENT_METHODS } from "./schema";
import type { TransactionWithDisplay } from "./display-currency";
import { TransactionDialog } from "./transaction-dialog";
import { DeleteTransactionButton } from "./delete-transaction-button";

interface TransactionsTableProps {
  transactions: TransactionWithDisplay[];
  canEdit: boolean;
  dateFormat?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  CSV: "CSV import",
  EXCEL: "Excel import",
};

export function TransactionsTable({ transactions, canEdit, dateFormat }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-[13px] font-medium">No transactions found</p>
        <p className="text-[13px] text-muted-foreground">
          Try a different search or filter, or add a new transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Customer/Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Payment method</TableHead>
            <TableHead className="text-right">Original amount</TableHead>
            <TableHead className="text-right">Display amount</TableHead>
            <TableHead>Source</TableHead>
            {canEdit && <TableHead className="w-0" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const sign = transaction.type === "INCOME" ? "+" : "\u2212";
            const amountClass =
              transaction.type === "INCOME" ? "text-income" : "text-expense";

            return (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {formatDate(transaction.date, dateFormat)}
                </TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {transaction.description || (
                    <span className="text-muted-foreground">{transaction.category}</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-muted-foreground">
                  {transaction.counterparty ?? "\u2014"}
                </TableCell>
                <TableCell className="text-muted-foreground">{transaction.category}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {transaction.paymentMethod
                    ? PAYMENT_METHOD_LABELS[
                        transaction.paymentMethod as (typeof PAYMENT_METHODS)[number]
                      ] ?? transaction.paymentMethod
                    : "\u2014"}
                </TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${amountClass}`}>
                  {sign}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {transaction.displayAmount ? (
                    <>
                      {transaction.currency !== transaction.displayCurrency && "\u2248 "}
                      {formatCurrency(transaction.displayAmount, transaction.displayCurrency)}
                    </>
                  ) : (
                    "Rate unavailable"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {SOURCE_LABELS[transaction.source] ?? transaction.source}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TransactionDialog
                        mode="edit"
                        transactionId={transaction.id}
                        defaultValues={{
                          date: transaction.date,
                          amount: transaction.amount,
                          currency: transaction.currency,
                          type: transaction.type,
                          category: transaction.category,
                          counterparty: transaction.counterparty ?? undefined,
                          paymentMethod: transaction.paymentMethod ?? undefined,
                          description: transaction.description ?? undefined,
                          referenceId: transaction.referenceId ?? undefined,
                        }}
                        trigger={
                          <Button type="button" variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteTransactionButton id={transaction.id} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

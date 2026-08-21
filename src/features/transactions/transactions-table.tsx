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
import type { Transaction } from "@/server/services/transactions";
import { TransactionDialog } from "./transaction-dialog";
import { DeleteTransactionButton } from "./delete-transaction-button";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-sm font-medium">No transactions yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first one with the button above.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
              {formatDate(transaction.date)}
            </TableCell>
            <TableCell>{transaction.category}</TableCell>
            <TableCell className="max-w-[240px] truncate text-muted-foreground">
              {transaction.description ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {transaction.referenceId ?? "—"}
            </TableCell>
            <TableCell
              className={
                "text-right tabular-nums font-medium " +
                (transaction.type === "INCOME" ? "text-income" : "text-expense")
              }
            >
              {transaction.type === "INCOME" ? "+" : "−"}
              {formatCurrency(transaction.amount, transaction.currency)}
            </TableCell>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

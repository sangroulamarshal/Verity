"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTransactionAction, updateTransactionAction } from "./actions";
import { TransactionForm, type TransactionFormDefaults } from "./transaction-form";

interface TransactionDialogProps {
  categories?: string[];
  mode: "create" | "edit";
  transactionId?: string;
  defaultValues?: TransactionFormDefaults;
  trigger: ReactNode;
}

export function TransactionDialog({
  mode,
  transactionId,
  defaultValues,
  categories,
  trigger,
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false);

  const action =
    mode === "edit" && transactionId
      ? updateTransactionAction.bind(null, transactionId)
      : createTransactionAction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit transaction" : "New transaction"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the details for this transaction."
              : "Enter the details for a manual transaction."}
          </DialogDescription>
        </DialogHeader>
        {/* Remounting on open/close discards any in-progress edits and
            clears stale validation errors from a previous open. */}
        <TransactionForm categories={categories}
          key={open ? "open" : "closed"}
          action={action}
          defaultValues={defaultValues}
          submitLabel={mode === "edit" ? "Save changes" : "Add transaction"}
          pendingLabel={mode === "edit" ? "Savingâ€¦" : "Addingâ€¦"}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

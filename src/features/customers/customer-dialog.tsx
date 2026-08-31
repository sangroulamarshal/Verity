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
import { createCustomerAction, updateCustomerAction } from "./actions";
import { CustomerForm, type CustomerFormDefaults } from "./customer-form";

interface CustomerDialogProps {
  mode: "create" | "edit";
  customerId?: string;
  defaultValues?: CustomerFormDefaults;
  trigger: ReactNode;
}

export function CustomerDialog({ mode, customerId, defaultValues, trigger }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);

  const action =
    mode === "edit" && customerId ? updateCustomerAction.bind(null, customerId) : createCustomerAction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update this customer's details."
              : "Add a customer or vendor you transact with."}
          </DialogDescription>
        </DialogHeader>
        {/* Remounting on open/close discards any in-progress edits and
            clears stale validation errors from a previous open — same
            reasoning as transaction-dialog.tsx. */}
        <CustomerForm
          key={open ? "open" : "closed"}
          action={action}
          defaultValues={defaultValues}
          submitLabel={mode === "edit" ? "Save changes" : "Add customer"}
          pendingLabel={mode === "edit" ? "Saving…" : "Adding…"}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

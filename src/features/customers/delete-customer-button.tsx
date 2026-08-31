"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCustomerAction } from "./actions";

interface DeleteCustomerButtonProps {
  id: string;
  /** Called after a successful delete — the detail page uses this to
   * navigate back to the list, since there's nothing left to show on a
   * page for a customer that no longer exists. */
  onDeleted?: () => void;
}

export function DeleteCustomerButton({ id, onDeleted }: DeleteCustomerButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this customer?"
        description="Transactions already linked to them are kept, just unlinked."
        isPending={isPending}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteCustomerAction(id);
            if (!result.success) {
              setError(result.message ?? "Something went wrong deleting this customer.");
              setConfirmOpen(false);
              return;
            }
            setConfirmOpen(false);
            onDeleted?.();
          });
        }}
      />
    </div>
  );
}

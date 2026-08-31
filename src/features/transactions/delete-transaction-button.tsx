"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTransactionAction } from "./actions";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // deleteTransactionAction's result was previously discarded entirely —
  // a failure had nowhere to go and nothing told the person it happened.
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this transaction?"
        description="This cannot be undone."
        isPending={isPending}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteTransactionAction(id);
            if (!result.success) {
              setError(result.message ?? "Something went wrong deleting this transaction.");
              setConfirmOpen(false);
              return;
            }
            setConfirmOpen(false);
          });
        }}
      />
    </div>
  );
}

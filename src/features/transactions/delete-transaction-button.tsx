"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransactionAction } from "./actions";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
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
        onClick={() => {
          if (!window.confirm("Delete this transaction? This cannot be undone.")) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteTransactionAction(id);
            if (!result.success) {
              setError(result.message ?? "Something went wrong deleting this transaction.");
            }
          });
        }}
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

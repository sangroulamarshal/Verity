"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransactionAction } from "./actions";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this transaction? This cannot be undone.")) {
          return;
        }
        startTransition(async () => {
          await deleteTransactionAction(id);
        });
      }}
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}

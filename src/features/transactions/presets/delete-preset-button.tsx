"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deletePresetAction } from "./actions";

export function DeletePresetButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this preset? Transactions already created from it are unaffected.")) {
          return;
        }
        startTransition(() => {
          deletePresetAction(id);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

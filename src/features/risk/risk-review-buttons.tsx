"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markRiskReviewedAction, markRiskDismissedAction } from "./actions";

export function RiskReviewButtons({
  transactionId,
  status,
}: {
  transactionId: string;
  status: "UNREVIEWED" | "REVIEWED" | "DISMISSED";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (status !== "UNREVIEWED") return null;

  const run = (action: (id: string) => Promise<{ message?: string; success?: boolean }>) => {
    startTransition(async () => {
      const result = await action(transactionId);
      if (result.message) {
        setMessage(result.message);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isPending} onClick={() => run(markRiskReviewedAction)}>
          Mark as Reviewed
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(markRiskDismissedAction)}
        >
          Dismiss
        </Button>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}

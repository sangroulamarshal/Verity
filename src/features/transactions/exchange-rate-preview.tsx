"use client";

import { useEffect, useState, useTransition } from "react";
import { formatCurrency } from "@/lib/format";
import { previewExchangeRateAction } from "./fx-preview-action";

interface ExchangeRatePreviewProps {
  amount: string;
  currency: string;
}

type PreviewResult = Awaited<ReturnType<typeof previewExchangeRateAction>>;

function isValidAmount(amount: string): boolean {
  const parsed = Number(amount);
  return !!amount && Number.isFinite(parsed) && parsed > 0;
}

/**
 * Debounced live preview of "this amount, converted to the org's base
 * currency" — brief section 24: financial users should be able to see
 * how the converted amount was calculated before they submit, not just
 * after. Says nothing when the currency already matches the base
 * currency (nothing to convert) or the amount isn't a valid positive
 * number yet.
 *
 * The fetched result is tagged with the exact (amount, currency) it was
 * fetched for, and render only trusts a result that still matches the
 * current inputs — this is what keeps a stale preview from flashing
 * while a newer request is in flight, without needing to clear state
 * synchronously inside the effect itself.
 */
export function ExchangeRatePreview({ amount, currency }: ExchangeRatePreviewProps) {
  const [entry, setEntry] = useState<{ amount: string; currency: string; data: PreviewResult } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isValidAmount(amount) || !currency) return;

    const handle = setTimeout(() => {
      startTransition(async () => {
        const data = await previewExchangeRateAction(amount, currency);
        setEntry({ amount, currency, data });
      });
    }, 350);

    return () => clearTimeout(handle);
  }, [amount, currency]);

  const result =
    entry && entry.amount === amount && entry.currency === currency ? entry.data : null;

  if (!isValidAmount(amount) || !result || (result.baseCurrency && currency.toUpperCase() === result.baseCurrency)) {
    return null;
  }

  if (!result.ok) {
    return (
      <p className="text-xs text-destructive" role="status">
        {result.message ?? "Exchange rate unavailable right now."}
      </p>
    );
  }

  if (!result.rate || !result.convertedAmount || !result.baseCurrency) return null;

  return (
    <div
      className="flex flex-col gap-0.5 rounded-md border border-border bg-elevated px-3 py-2 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <p>
        1 {currency.toUpperCase()} = {Number(result.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
        {result.baseCurrency}
      </p>
      <p className="font-medium text-foreground">
        Converted value: {formatCurrency(result.convertedAmount, result.baseCurrency)}
      </p>
      {result.rateTime && (
        <p>Rate retrieved {new Date(result.rateTime).toLocaleString()}</p>
      )}
      {pending && <p className="italic">Refreshing…</p>}
    </div>
  );
}

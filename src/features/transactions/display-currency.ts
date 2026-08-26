import "server-only";
import { getExchangeRate, FxRateUnavailableError } from "@/server/services/fx";
import { convertAmount } from "@/lib/money";
import type { Transaction } from "@/server/services/transactions";

export interface TransactionWithDisplay extends Transaction {
  /** Null when the org's base → display-currency rate couldn't be
   * obtained — the table falls back to showing only the original/base
   * amounts rather than a guessed conversion. */
  displayAmount: string | null;
  displayCurrency: string;
}

/**
 * Resolves "display currency" amounts for a page of transactions,
 * calling the FX service once per distinct base currency present (not
 * once per row) — a page of 20 GBP transactions costs one rate lookup,
 * cached besides. Never touches the transaction's own stored
 * amount/baseAmount; this is purely a read-time projection (brief
 * section 23 — changing display currency never rewrites stored values).
 */
export async function withDisplayAmounts(
  rows: Transaction[],
  displayCurrency: string
): Promise<TransactionWithDisplay[]> {
  const distinctBaseCurrencies = [...new Set(rows.map((row) => row.baseCurrency))];

  const rateEntries = await Promise.all(
    distinctBaseCurrencies.map(async (base) => {
      if (base.toUpperCase() === displayCurrency.toUpperCase()) {
        return [base, "1"] as const;
      }
      try {
        const rate = await getExchangeRate(base, displayCurrency);
        return [base, rate.rate] as const;
      } catch (error) {
        if (error instanceof FxRateUnavailableError) {
          return [base, null] as const;
        }
        throw error;
      }
    })
  );
  const rateByBase = new Map(rateEntries);

  return rows.map((row) => {
    const rate = rateByBase.get(row.baseCurrency);
    return {
      ...row,
      displayAmount: rate ? convertAmount(row.baseAmount, rate) : null,
      displayCurrency: displayCurrency.toUpperCase(),
    };
  });
}

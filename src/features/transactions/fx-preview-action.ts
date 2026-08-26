"use server";

import { verifySession } from "@/server/services/session";
import { getOrganization } from "@/server/services/organizations";
import { convertToTargetCurrency, FxRateUnavailableError } from "@/server/services/fx";

export interface FxPreviewResult {
  ok: boolean;
  message?: string;
  baseCurrency?: string;
  rate?: string;
  convertedAmount?: string;
  rateTime?: string;
}

/**
 * Called from the transaction form (client component) as the amount/
 * currency fields change, so the person can see the conversion before
 * submitting (brief section 24 — "do not hide the conversion"). Read-only:
 * never writes a transaction or mutates anything beyond the FX cache
 * table getExchangeRate already maintains.
 */
export async function previewExchangeRateAction(
  amount: string,
  currency: string
): Promise<FxPreviewResult> {
  const session = await verifySession();
  const organization = await getOrganization(session.organizationId);
  const baseCurrency = organization?.baseCurrency ?? "GBP";

  const parsedAmount = Number(amount);
  if (!amount || !currency || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { ok: false, baseCurrency };
  }

  try {
    const converted = await convertToTargetCurrency(
      parsedAmount.toFixed(2),
      currency,
      baseCurrency
    );
    return {
      ok: true,
      baseCurrency,
      rate: converted.rate.rate,
      convertedAmount: converted.convertedAmount,
      rateTime: converted.rate.time.toISOString(),
    };
  } catch (error) {
    if (error instanceof FxRateUnavailableError) {
      return { ok: false, baseCurrency, message: "Exchange rate unavailable right now." };
    }
    throw error;
  }
}

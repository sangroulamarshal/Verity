import "server-only";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fxRates } from "@/db/schema";
import { convertAmount } from "@/lib/money";

const FX_API_URL = "https://allratestoday.com/api/v1/rates";
const FX_SOURCE_LABEL = "allratestoday";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — see brief section 25 ("don't call the API unnecessarily")

/**
 * Thrown when a rate genuinely cannot be obtained (API unreachable,
 * malformed response, non-2xx status). Callers must handle this
 * explicitly — brief section 25/43: never fabricate a rate, never
 * silently save an incorrect converted amount, let the user retry.
 */
export class FxRateUnavailableError extends Error {
  readonly sourceCurrency: string;
  readonly targetCurrency: string;

  constructor(sourceCurrency: string, targetCurrency: string, cause?: unknown) {
    super(`Exchange rate for ${sourceCurrency} \u2192 ${targetCurrency} is currently unavailable.`);
    this.name = "FxRateUnavailableError";
    this.sourceCurrency = sourceCurrency;
    this.targetCurrency = targetCurrency;
    this.cause = cause;
  }
}

export interface ExchangeRateResult {
  /** Decimal string, up to 6 places — never a JS number, see lib/money.ts. */
  rate: string;
  source: string;
  time: Date;
}

export interface ConvertedAmount {
  originalAmount: string;
  originalCurrency: string;
  convertedAmount: string;
  targetCurrency: string;
  rate: ExchangeRateResult;
}

// The API's response is a bare array — see brief section 19. Validated
// rather than trusted, since it's third-party input.
const fxApiResponseSchema = z
  .array(
    z.object({
      rate: z.number().positive(),
      source: z.string(),
      target: z.string(),
      time: z.string(),
    })
  )
  .min(1, "Empty rate response");

/**
 * Resolves the exchange rate for source → target, using a cached rate
 * when one is fresh enough, otherwise calling the FX API and caching the
 * result. NPR → NPR (same currency) never touches the cache or the API
 * (brief section 26) and always returns an exact rate of 1.
 */
export async function getExchangeRate(
  sourceCurrency: string,
  targetCurrency: string
): Promise<ExchangeRateResult> {
  const source = sourceCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  if (source === target) {
    return { rate: "1", source: "same-currency", time: new Date() };
  }

  const cached = await getCachedRate(source, target);
  if (cached) return cached;

  return fetchAndCacheRate(source, target);
}

/**
 * Convenience wrapper: resolves the rate and returns the converted
 * amount alongside it, using precision-safe fixed-point math (never
 * `Number(amount) * Number(rate)` directly — see lib/money.ts).
 */
export async function convertToTargetCurrency(
  amount: string,
  sourceCurrency: string,
  targetCurrency: string
): Promise<ConvertedAmount> {
  const rate = await getExchangeRate(sourceCurrency, targetCurrency);
  const convertedAmount =
    sourceCurrency.toUpperCase() === targetCurrency.toUpperCase()
      ? amount
      : convertAmount(amount, rate.rate);

  return {
    originalAmount: amount,
    originalCurrency: sourceCurrency.toUpperCase(),
    convertedAmount,
    targetCurrency: targetCurrency.toUpperCase(),
    rate,
  };
}

async function getCachedRate(source: string, target: string): Promise<ExchangeRateResult | null> {
  const [row] = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.sourceCurrency, source), eq(fxRates.targetCurrency, target)))
    .limit(1);

  if (!row) return null;

  const age = Date.now() - row.fetchedAt.getTime();
  if (age > CACHE_TTL_MS) return null;

  return { rate: row.rate, source: row.source, time: row.rateTime ?? row.fetchedAt };
}

async function fetchAndCacheRate(source: string, target: string): Promise<ExchangeRateResult> {
  let result: ExchangeRateResult;

  try {
    const url = new URL(FX_API_URL);
    url.searchParams.set("source", source);
    url.searchParams.set("target", target);

    // Server-side only — never exposed to the client. Optional: not
    // every deployment of allratestoday.com's API requires a key; when
    // one is configured it's sent as a bearer token rather than a query
    // param so it never ends up in a log line that captures the URL.
    const headers: Record<string, string> = {};
    if (process.env.ALLRATES_API_KEY) {
      headers.Authorization = `Bearer ${process.env.ALLRATES_API_KEY}`;
    }

    const response = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`FX API responded with status ${response.status}`);
    }

    const json = await response.json();
    // response[0].rate / .source / .target / .time — see brief section 19.
    const [quote] = fxApiResponseSchema.parse(json);

    result = {
      rate: quote.rate.toString(),
      source: FX_SOURCE_LABEL,
      time: new Date(quote.time),
    };
  } catch (error) {
    throw new FxRateUnavailableError(source, target, error);
  }

  await upsertCachedRate(source, target, result);
  return result;
}

async function upsertCachedRate(
  source: string,
  target: string,
  result: ExchangeRateResult
): Promise<void> {
  await db
    .insert(fxRates)
    .values({
      sourceCurrency: source,
      targetCurrency: target,
      rate: result.rate,
      source: result.source,
      rateTime: result.time,
    })
    .onConflictDoUpdate({
      target: [fxRates.sourceCurrency, fxRates.targetCurrency],
      set: {
        rate: result.rate,
        source: result.source,
        fetchedAt: new Date(),
        rateTime: result.time,
      },
    });
}

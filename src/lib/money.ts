/**
 * Fixed-point money math. `amount` strings are always "N.NN" (2 decimal
 * places — enforced by transactionSchema's amountSchema before this is
 * ever called) and `rate` strings are up to 6 decimal places (the
 * precision transactions.exchangeRate / fx_rates.rate are stored at).
 *
 * Converting via `Number(amount) * Number(rate)` would introduce binary
 * floating-point error before the result is even rounded — this instead
 * scales both operands to integers (BigInt, so no precision ceiling),
 * multiplies exactly, then rounds once at the very end. That single
 * controlled rounding step is the only place any precision is lost,
 * which is what brief section 27 ("do not use floating point carelessly
 * for financial values ... do not introduce rounding errors") asks for.
 */

const AMOUNT_DECIMALS = 2;
const RATE_DECIMALS = 6;

function toScaledBigInt(value: string, decimals: number): bigint {
  const [wholePart, fractionPart = ""] = value.trim().split(".");
  const paddedFraction = (fractionPart + "0".repeat(decimals)).slice(0, decimals);
  const sign = wholePart.startsWith("-") ? BigInt(-1) : BigInt(1);
  const digits = `${wholePart.replace("-", "")}${paddedFraction}`;
  return sign * BigInt(digits || "0");
}

/**
 * Converts a money amount from its original currency to a target
 * currency using the given rate, returning a "N.NN" string. Round-half-
 * up on the final division, matching how money is conventionally rounded
 * (never banker's rounding for a customer-facing converted total).
 */
export function convertAmount(amount: string, rate: string): string {
  const amountScaled = toScaledBigInt(amount, AMOUNT_DECIMALS); // × 10^2
  const rateScaled = toScaledBigInt(rate, RATE_DECIMALS); // × 10^6

  // amountScaled × rateScaled is the true product × 10^8. Dividing back
  // down to × 10^2 (2 decimal places) needs a ÷ 10^6, done with
  // round-half-up rather than BigInt's truncating division.
  const divisor = BigInt(10) ** BigInt(RATE_DECIMALS);
  const product = amountScaled * rateScaled;
  const negative = product < BigInt(0);
  const absProduct = negative ? -product : product;
  const rounded = (absProduct + divisor / BigInt(2)) / divisor;
  const finalValue = negative ? -rounded : rounded;

  return formatScaledBigInt(finalValue, AMOUNT_DECIMALS);
}

function formatScaledBigInt(value: bigint, decimals: number): string {
  const negative = value < BigInt(0);
  const absValue = negative ? -value : value;
  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = absValue / divisor;
  const fractionPart = (absValue % divisor).toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${wholePart}.${fractionPart}`;
}

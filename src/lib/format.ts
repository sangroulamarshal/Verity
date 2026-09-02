/**
 * Pure display-formatting helpers. No framework imports, no DB access —
 * safe to unit test in isolation and safe to reuse from engines later
 * (Phase 6/7) without dragging in server-only code.
 */

// `Intl.NumberFormat` construction (locale/currency-data lookup) is
// measurably more expensive than the format() call itself — constructing
// a fresh one per call adds up fast on any page rendering a table of
// amounts (e.g. 20-100 transaction rows x up to 2 amounts each, every
// request). Locale is always `undefined` here (process default, stable
// for the life of the server), so a formatter is safe to cache and reuse
// by currency code alone — this is the standard MDN-recommended pattern
// for repeated Intl usage.
const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * Formats a monetary amount for display. `amount` is accepted as a string
 * because that's how it round-trips through the DB and forms without
 * floating-point drift; it's parsed to a number only here, at the point of
 * display, never earlier.
 */
export function formatCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "—";

  try {
    return getCurrencyFormatter(currency || "USD").format(value);
  } catch {
    // Intl throws on a currency code it doesn't recognize (e.g. a typo
    // that slipped past the format-only regex check). Fall back to a
    // plain number rather than crashing the row that contains it — and
    // don't cache anything for the bad code, so a genuinely bad currency
    // never poisons the cache for a later, valid lookup under the same key.
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Formats a `YYYY-MM-DD` date string for display. Returns the input
 * unchanged if it isn't well-formed, rather than guessing. `format`
 * defaults to the UK-conventional DD/MM/YYYY but can be overridden with
 * the org member's own preference (Settings > Preferences). */
export function formatDate(
  isoDate: string,
  format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" = "DD/MM/YYYY"
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  switch (format) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD/MM/YYYY":
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Compact currency formatter for KPI cards and chart axes.
 * Abbreviates large values: 15183005007 ? "Rs 15.18B", 2500000 ? "Rs 2.5M", 12345 ? "Rs 12.3K"
 * Falls back to full formatCurrency below 10,000.
 */
export function formatCompactCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "�";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const symbol = (() => {
    try {
      return getCurrencyFormatter(currency || "USD")
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency;
    } catch {
      return currency;
    }
  })();
  if (abs >= 1_000_000_000) return `${sign}${symbol} ${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)        return `${sign}${symbol} ${(abs / 1_000).toFixed(1)}K`;
  return formatCurrency(value, currency);
}

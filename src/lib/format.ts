/**
 * Pure display-formatting helpers. No framework imports, no DB access —
 * safe to unit test in isolation and safe to reuse from engines later
 * (Phase 6/7) without dragging in server-only code.
 */

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
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    // Intl throws on a currency code it doesn't recognize (e.g. a typo
    // that slipped past the format-only regex check). Fall back to a
    // plain number rather than crashing the row that contains it.
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Formats a `YYYY-MM-DD` date string for display, in a fixed locale-agnostic
 * numeric form so table columns line up. Returns the input unchanged if it
 * isn't well-formed, rather than guessing. */
export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

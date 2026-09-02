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

export function formatCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "-";
  try {
    return getCurrencyFormatter(currency || "USD").format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatCompactCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const symbol = (() => {
    try {
      return getCurrencyFormatter(currency || "USD").formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
    } catch { return currency; }
  })();
  if (abs >= 1_000_000_000) return `${sign}${symbol} ${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${sign}${symbol} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)        return `${sign}${symbol} ${(abs / 1_000).toFixed(1)}K`;
  return formatCurrency(value, currency);
}

export function formatDate(
  isoDate: string,
  format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" = "DD/MM/YYYY"
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  switch (format) {
    case "MM/DD/YYYY": return `${month}/${day}/${year}`;
    case "YYYY-MM-DD": return `${year}-${month}-${day}`;
    default:           return `${day}/${month}/${year}`;
  }
}
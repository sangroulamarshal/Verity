/**
 * Currencies a transaction can be recorded in. Kept broader than the
 * display-currency list below since a business might legitimately
 * receive a one-off payment in a currency it doesn't otherwise report in.
 */
export const TRANSACTION_CURRENCIES = ["GBP", "USD", "EUR", "NPR", "INR", "AUD", "CAD"] as const;

/**
 * Currencies offered as a global display-currency preference (brief
 * section 23). Deliberately the exact list the brief names — NPR, USD,
 * EUR, GBP, INR — narrower than TRANSACTION_CURRENCIES because a display
 * currency is meant to be "the handful of currencies this business's
 * people actually think in", not every currency a transaction could ever
 * arrive in.
 */
export const DISPLAY_CURRENCIES = ["NPR", "USD", "EUR", "GBP", "INR"] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export function isSupportedTransactionCurrency(value: string): boolean {
  return (TRANSACTION_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

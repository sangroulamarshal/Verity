import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  it("formats a string amount with the given currency", () => {
    expect(formatCurrency("1234.5", "USD")).toBe("$1,234.50");
  });

  it("formats a numeric amount", () => {
    expect(formatCurrency(99, "GBP")).toBe("£99.00");
  });

  it("falls back gracefully for a non-finite amount", () => {
    expect(formatCurrency("not-a-number", "USD")).toBe("—");
  });

  it("still renders a well-formed but unrecognized currency code", () => {
    // Intl.NumberFormat only requires a currency code to be well-formed
    // (3 letters) — it doesn't validate it against a real ISO 4217 list,
    // so "ZZZ" renders with the code as a label rather than throwing.
    // Note: Intl separates the code and amount with a non-breaking space
    // (U+00A0), not a regular space.
    expect(formatCurrency("10", "ZZZ")).toBe("ZZZ\u00A010.00");
  });

  it("falls back to a plain number for a malformed currency code", () => {
    // A genuinely malformed code (wrong length) is what actually makes
    // Intl.NumberFormat throw, exercising the catch fallback below.
    expect(formatCurrency("10", "USDX")).toBe("10.00 USDX");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as DD/MM/YYYY", () => {
    expect(formatDate("2026-03-05")).toBe("05/03/2026");
  });

  it("returns the input unchanged if it isn't a well-formed date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

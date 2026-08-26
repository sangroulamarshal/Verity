import { describe, expect, it } from "vitest";
import { convertAmount } from "./money";

describe("convertAmount", () => {
  it("converts using the exact rate given in brief section 19 (USD -> NPR)", () => {
    expect(convertAmount("1000.00", "152.665")).toBe("152665.00");
  });

  it("rounds half up on the final cent", () => {
    // 10.005 exactly at the rounding boundary
    expect(convertAmount("10.00", "1.0005")).toBe("10.01");
  });

  it("never introduces float drift for repeating-decimal-prone values", () => {
    // 0.1 * 3 famously isn't exactly 0.3 in IEEE 754 — this must be exact.
    expect(convertAmount("0.10", "3")).toBe("0.30");
  });

  it("handles a rate of 1 (same-currency shortcut callers may still route through here)", () => {
    expect(convertAmount("1234.56", "1")).toBe("1234.56");
  });

  it("handles small amounts without losing precision", () => {
    expect(convertAmount("0.01", "0.5")).toBe("0.01"); // 0.005 rounds up to 0.01
  });

  it("handles large amounts", () => {
    expect(convertAmount("999999999.99", "1.5")).toBe("1499999999.99");
  });

  it("handles a zero amount", () => {
    expect(convertAmount("0.00", "152.665")).toBe("0.00");
  });
});

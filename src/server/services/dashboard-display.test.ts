import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DashboardSummary } from "@/server/services/dashboard";

// fx.ts imports the real db client at module scope (for its rate cache
// table), which throws in this test env without a DATABASE_URL — so this
// mocks the module fully rather than via importActual, keeping both the
// network/DB-backed getExchangeRate() and its db import out of the test
// entirely. FxRateUnavailableError is redefined here as a lightweight
// stand-in with the same shape (name, sourceCurrency, targetCurrency);
// since both this file and dashboard-display.ts resolve "@/server/services/fx"
// to this same mocked module, `instanceof` checks on either side still work.
vi.mock("@/server/services/fx", () => {
  class FxRateUnavailableError extends Error {
    sourceCurrency: string;
    targetCurrency: string;
    constructor(sourceCurrency: string, targetCurrency: string) {
      super(`Exchange rate for ${sourceCurrency} -> ${targetCurrency} is unavailable.`);
      this.name = "FxRateUnavailableError";
      this.sourceCurrency = sourceCurrency;
      this.targetCurrency = targetCurrency;
    }
  }
  return {
    getExchangeRate: vi.fn(),
    FxRateUnavailableError,
  };
});

import { getExchangeRate, FxRateUnavailableError } from "@/server/services/fx";
import { resolveDisplaySummary } from "./dashboard-display";

const getExchangeRateMock = vi.mocked(getExchangeRate);

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalIncome: 1000,
    totalExpense: 400,
    netCashFlow: 600,
    transactionCount: 12,
    monthlyTotals: [
      { month: "2026-07", income: 500, expense: 200 },
      { month: "2026-08", income: 500, expense: 200 },
    ],
    recentTransactions: [],
    ...overrides,
  };
}

beforeEach(() => {
  getExchangeRateMock.mockReset();
});

describe("resolveDisplaySummary", () => {
  it("passes the summary through untouched when base and display currency match", async () => {
    const input = summary();
    const result = await resolveDisplaySummary(input, "GBP", "GBP");

    expect(result).toEqual({ summary: input, currency: "GBP", rateUnavailable: false });
    expect(getExchangeRateMock).not.toHaveBeenCalled();
  });

  it("treats currency codes as case-insensitive for the same-currency shortcut", async () => {
    const input = summary();
    const result = await resolveDisplaySummary(input, "gbp", "GBP");

    expect(result.rateUnavailable).toBe(false);
    expect(getExchangeRateMock).not.toHaveBeenCalled();
  });

  it("converts every total and each month using a single rate lookup", async () => {
    getExchangeRateMock.mockResolvedValue({
      rate: "0.006",
      source: "allratestoday",
      time: new Date("2026-08-27T00:00:00Z"),
    });

    const input = summary({
      totalIncome: 1000,
      totalExpense: 400,
      netCashFlow: 600,
      monthlyTotals: [{ month: "2026-08", income: 500, expense: 200 }],
    });

    const result = await resolveDisplaySummary(input, "NPR", "USD");

    expect(getExchangeRateMock).toHaveBeenCalledTimes(1);
    expect(getExchangeRateMock).toHaveBeenCalledWith("NPR", "USD");
    expect(result.currency).toBe("USD");
    expect(result.rateUnavailable).toBe(false);
    expect(result.summary.totalIncome).toBeCloseTo(6, 5);
    expect(result.summary.totalExpense).toBeCloseTo(2.4, 5);
    expect(result.summary.netCashFlow).toBeCloseTo(3.6, 5);
    expect(result.summary.monthlyTotals).toEqual([
      { month: "2026-08", income: 3, expense: 1.2 },
    ]);
  });

  it("preserves the sign of a negative net cash flow (expenses exceeding income)", async () => {
    getExchangeRateMock.mockResolvedValue({
      rate: "0.006",
      source: "allratestoday",
      time: new Date(),
    });

    const input = summary({ totalIncome: 100, totalExpense: 300, netCashFlow: -200 });
    const result = await resolveDisplaySummary(input, "NPR", "USD");

    expect(result.summary.netCashFlow).toBeCloseTo(-1.2, 5);
  });

  it("falls back to the base currency and flags rateUnavailable when the FX lookup fails", async () => {
    getExchangeRateMock.mockRejectedValue(new FxRateUnavailableError("NPR", "USD"));

    const input = summary();
    const result = await resolveDisplaySummary(input, "NPR", "USD");

    expect(result).toEqual({ summary: input, currency: "NPR", rateUnavailable: true });
  });

  it("does not swallow errors that aren't FxRateUnavailableError", async () => {
    getExchangeRateMock.mockRejectedValue(new Error("db connection refused"));

    await expect(resolveDisplaySummary(summary(), "NPR", "USD")).rejects.toThrow(
      "db connection refused"
    );
  });
});

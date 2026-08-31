import { describe, expect, it } from "vitest";
import { evaluateTransactionRisk, riskLevelForScore, type RiskEvaluationInput } from "./risk-engine";

const baseInput: RiskEvaluationInput = {
  baseAmount: 15_000,
  source: "MANUAL",
  hasCustomer: false,
  isNewOrInactiveCustomer: false,
  organizationAmountRef: { mean: 15_000, sampleSize: 20 },
  categoryAmountRef: { mean: 15_000, sampleSize: 10 },
  customerAmountRef: null,
  frequency: null,
  duplicateMatchCount: 0,
  categoryTrend: null,
};

describe("riskLevelForScore", () => {
  it("classifies the documented thresholds correctly, including boundaries", () => {
    expect(riskLevelForScore(0)).toBe("LOW");
    expect(riskLevelForScore(29)).toBe("LOW");
    expect(riskLevelForScore(30)).toBe("MEDIUM");
    expect(riskLevelForScore(59)).toBe("MEDIUM");
    expect(riskLevelForScore(60)).toBe("HIGH");
    expect(riskLevelForScore(79)).toBe("HIGH");
    expect(riskLevelForScore(80)).toBe("CRITICAL");
    expect(riskLevelForScore(100)).toBe("CRITICAL");
  });
});

describe("evaluateTransactionRisk", () => {
  it("scores a normal, in-pattern transaction as LOW with no signals", () => {
    const result = evaluateTransactionRisk(baseInput);
    expect(result.level).toBe("LOW");
    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it("flags an unusually large transaction against organization/category history", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 185_000, // ~12x the 15,000 mean
    });
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.level).not.toBe("LOW");
  });

  it("does not fabricate an amount anomaly when there isn't enough history", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 500_000,
      organizationAmountRef: { mean: 15_000, sampleSize: 1 }, // below MIN_SAMPLE_SIZE
      categoryAmountRef: { mean: 15_000, sampleSize: 1 },
    });
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(false);
  });

  it("flags a duplicate/similar transaction", () => {
    const result = evaluateTransactionRisk({ ...baseInput, duplicateMatchCount: 1 });
    const signal = result.signals.find((s) => s.type === "DUPLICATE_SIMILAR");
    expect(signal).toBeDefined();
    expect(signal!.points).toBe(15);
  });

  it("scales duplicate points up with more matches, capped at 25", () => {
    const result = evaluateTransactionRisk({ ...baseInput, duplicateMatchCount: 5 });
    const signal = result.signals.find((s) => s.type === "DUPLICATE_SIMILAR");
    expect(signal!.points).toBe(25);
  });

  it("flags a frequency anomaly — a burst well above the expected rate", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      frequency: { windowCount: 25, expectedWindowCount: 2 },
    });
    expect(result.signals.some((s) => s.type === "FREQUENCY_ANOMALY")).toBe(true);
  });

  it("does not flag frequency when the window count is too small to be meaningful", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      frequency: { windowCount: 2, expectedWindowCount: 0.1 },
    });
    expect(result.signals.some((s) => s.type === "FREQUENCY_ANOMALY")).toBe(false);
  });

  it("flags a customer-specific anomaly independent of org/category history", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      hasCustomer: true,
      baseAmount: 450_000,
      customerAmountRef: { mean: 30_000, sampleSize: 8 }, // ~15x this customer's own average
      // Org/category history looks unremarkable for this amount so only
      // the customer-specific signal should fire.
      organizationAmountRef: { mean: 400_000, sampleSize: 20 },
      categoryAmountRef: { mean: 400_000, sampleSize: 20 },
    });
    expect(result.signals.some((s) => s.type === "CUSTOMER_ANOMALY")).toBe(true);
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(false);
  });

  it("flags a category spending trend anomaly", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      categoryTrend: { currentPeriodTotal: 300_000, averagePriorPeriodTotal: 80_000, periodsOfHistory: 3 },
    });
    expect(result.signals.some((s) => s.type === "CATEGORY_ANOMALY")).toBe(true);
  });

  it("combines multiple signals into one score", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 185_000,
      duplicateMatchCount: 1,
      frequency: { windowCount: 25, expectedWindowCount: 2 },
    });
    const types = result.signals.map((s) => s.type);
    expect(types).toContain("UNUSUAL_AMOUNT");
    expect(types).toContain("DUPLICATE_SIMILAR");
    expect(types).toContain("FREQUENCY_ANOMALY");
    expect(result.score).toBe(Math.min(100, result.signals.reduce((sum, s) => sum + s.points, 0)));
  });

  it("caps the final score at 100 no matter how many signals fire", () => {
    const result = evaluateTransactionRisk({
      baseAmount: 1_000_000,
      source: "CSV",
      hasCustomer: true,
      isNewOrInactiveCustomer: true,
      organizationAmountRef: { mean: 10_000, sampleSize: 50 },
      categoryAmountRef: { mean: 10_000, sampleSize: 50 },
      customerAmountRef: { mean: 10_000, sampleSize: 10 },
      frequency: { windowCount: 50, expectedWindowCount: 2 },
      duplicateMatchCount: 10,
      categoryTrend: { currentPeriodTotal: 1_000_000, averagePriorPeriodTotal: 50_000, periodsOfHistory: 6 },
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe("CRITICAL");
  });

  it("gives a small, non-dominant new-customer signal, never a heavy penalty alone", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      hasCustomer: true,
      isNewOrInactiveCustomer: true,
    });
    expect(result.signals).toEqual([
      { type: "NEW_CUSTOMER", points: 3, explanation: expect.any(String) },
    ]);
    expect(result.level).toBe("LOW");
  });

  it("only adds manual-entry context when another signal has already fired", () => {
    const cleanManual = evaluateTransactionRisk({ ...baseInput, source: "MANUAL" });
    expect(cleanManual.signals.some((s) => s.type === "MANUAL_ENTRY_CONTEXT")).toBe(false);

    const flaggedManual = evaluateTransactionRisk({
      ...baseInput,
      source: "MANUAL",
      duplicateMatchCount: 1,
    });
    expect(flaggedManual.signals.some((s) => s.type === "MANUAL_ENTRY_CONTEXT")).toBe(true);
  });

  it("adds import context instead of manual context for CSV/EXCEL sources", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      source: "EXCEL",
      duplicateMatchCount: 1,
    });
    expect(result.signals.some((s) => s.type === "IMPORT_CONTEXT")).toBe(true);
    expect(result.signals.some((s) => s.type === "MANUAL_ENTRY_CONTEXT")).toBe(false);
  });

  it("flags an unusually large round-number amount as a weak signal only", () => {
    const result = evaluateTransactionRisk({ ...baseInput, baseAmount: 500_000 });
    const signal = result.signals.find((s) => s.type === "ROUND_NUMBER");
    expect(signal?.points).toBe(3);
  });

  it("every point awarded is deterministic given the same input", () => {
    const input: RiskEvaluationInput = {
      ...baseInput,
      baseAmount: 200_000,
      duplicateMatchCount: 2,
    };
    const a = evaluateTransactionRisk(input);
    const b = evaluateTransactionRisk(input);
    expect(a).toEqual(b);
  });
});

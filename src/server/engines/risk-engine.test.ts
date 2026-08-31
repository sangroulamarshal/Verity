import { describe, expect, it } from "vitest";
import {
  evaluateTransactionRisk,
  riskLevelForScore,
  type AmountBaseline,
  type RiskEvaluationInput,
} from "./risk-engine";

// A typical category: median 10,000, spread (MAD) 1,500 — i.e. amounts
// normally vary by roughly 15% around the median.
const typicalBaseline: AmountBaseline = { median: 10_000, mad: 1_500, sampleSize: 20 };
const noBaseline: AmountBaseline = { median: 0, mad: 0, sampleSize: 0 };

const baseInput: RiskEvaluationInput = {
  baseAmount: 10_000,
  source: "MANUAL",
  hasCustomer: false,
  isNewOrInactiveCustomer: false,
  organizationAmountBaseline: typicalBaseline,
  categoryAmountBaseline: typicalBaseline,
  customerAmountBaseline: null,
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

describe("evaluateTransactionRisk — basic scoring", () => {
  it("A: scores a normal, in-pattern transaction as LOW with no signals, high confidence", () => {
    const result = evaluateTransactionRisk(baseInput);
    expect(result.level).toBe("LOW");
    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
    expect(result.confidence).toBe("HIGH");
  });

  it("B: a mild (~2x) deviation produces a modest signal, no escalation floor", () => {
    const result = evaluateTransactionRisk({ ...baseInput, baseAmount: 20_000 }); // z ≈ 4.5 -> MODERATE
    const signal = result.signals.find((s) => s.type === "UNUSUAL_AMOUNT");
    expect(signal).toBeDefined();
    expect(result.level).not.toBe("CRITICAL");
    expect(result.level).not.toBe("HIGH");
  });

  it("C: a ~10x deviation is significantly elevated and floors at least HIGH", () => {
    const result = evaluateTransactionRisk({ ...baseInput, baseAmount: 100_000 }); // z ≈ 40.5 -> VERY_SEVERE
    expect(result.level).toBe("HIGH");
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("D: a ~100x deviation reaches very high severity (CRITICAL floor)", () => {
    const result = evaluateTransactionRisk({ ...baseInput, baseAmount: 1_000_000 }); // z ≈ 445 -> EXTREME
    expect(result.level).toBe("CRITICAL");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});

describe("evaluateTransactionRisk — regression: the reported 921x/MEDIUM bug", () => {
  it("E: a ~921x category anomaly must NOT remain MEDIUM — it must floor at CRITICAL", () => {
    // Mirrors the exact reported failure: a small, tight category
    // baseline (median 50, MAD 7.5) and a transaction ~921x that
    // median. Under the old flat ratio>=5 cap this produced a capped
    // +30 and stayed MEDIUM. It must now escalate independently of the
    // additive score's own cap.
    const tightCategory: AmountBaseline = { median: 50, mad: 7.5, sampleSize: 12 };
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 46_065, // 46065 / 50 = 921.3x
      categoryAmountBaseline: tightCategory,
      organizationAmountBaseline: tightCategory,
      source: "MANUAL",
    });

    expect(result.level).toBe("CRITICAL");
    expect(result.score).toBeGreaterThanOrEqual(80);
    const signal = result.signals.find((s) => s.type === "UNUSUAL_AMOUNT");
    expect(signal).toBeDefined();
    expect(signal!.explanation).toMatch(/921\.3x/);
    expect(signal!.explanation).toMatch(/12 historical transactions/);
  });

  it("does not treat a 5x deviation the same as a 921x deviation (the actual bug)", () => {
    const tightCategory: AmountBaseline = { median: 50, mad: 7.5, sampleSize: 12 };
    const mild = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 250, // 5x
      categoryAmountBaseline: tightCategory,
      organizationAmountBaseline: tightCategory,
    });
    const extreme = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 46_065, // 921.3x
      categoryAmountBaseline: tightCategory,
      organizationAmountBaseline: tightCategory,
    });
    expect(extreme.score).toBeGreaterThan(mild.score);
    expect(extreme.level).not.toBe(mild.level);
  });

  it("score is always consistent with the escalated level (never shows e.g. CRITICAL at score 35)", () => {
    const tightCategory: AmountBaseline = { median: 50, mad: 7.5, sampleSize: 12 };
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 46_065,
      categoryAmountBaseline: tightCategory,
      organizationAmountBaseline: tightCategory,
    });
    const minForLevel = { LOW: 0, MEDIUM: 30, HIGH: 60, CRITICAL: 80 }[result.level];
    expect(result.score).toBeGreaterThanOrEqual(minForLevel);
  });
});

describe("evaluateTransactionRisk — data sufficiency and confidence", () => {
  it("F: does not fabricate an amount anomaly with fewer than 2 historical transactions", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 500_000,
      organizationAmountBaseline: { median: 10_000, mad: 1_500, sampleSize: 1 },
      categoryAmountBaseline: { median: 10_000, mad: 1_500, sampleSize: 1 },
    });
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(false);
  });

  it("F: with zero historical transactions, no amount signal fires at all", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 500_000,
      organizationAmountBaseline: noBaseline,
      categoryAmountBaseline: noBaseline,
    });
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(false);
    expect(result.level).toBe("LOW");
  });

  it("reports LOW confidence for an extreme anomaly backed by thin history, without suppressing severity", () => {
    // Exactly the brief's preferred honesty: "CRITICAL severity, LOW
    // confidence" beats silently downgrading to MEDIUM because there's
    // not much history yet.
    const thinCategory: AmountBaseline = { median: 1_000, mad: 150, sampleSize: 2 };
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 500_000,
      categoryAmountBaseline: thinCategory,
      organizationAmountBaseline: thinCategory,
    });
    expect(result.level).toBe("CRITICAL");
    expect(result.confidence).toBe("LOW");
  });

  it("M: reports MEDIUM confidence with a moderate sample size (5-19)", () => {
    const modestCategory: AmountBaseline = { median: 10_000, mad: 1_500, sampleSize: 8 };
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 100_000,
      categoryAmountBaseline: modestCategory,
      organizationAmountBaseline: modestCategory,
    });
    expect(result.confidence).toBe("MEDIUM");
  });

  it("reports HIGH confidence with a large sample size (20+)", () => {
    const result = evaluateTransactionRisk({ ...baseInput, baseAmount: 100_000 }); // typicalBaseline: sampleSize 20
    expect(result.confidence).toBe("HIGH");
  });
});

describe("evaluateTransactionRisk — other signals", () => {
  it("G: flags a duplicate/similar transaction, scaling with match count up to the cap", () => {
    const one = evaluateTransactionRisk({ ...baseInput, duplicateMatchCount: 1 });
    expect(one.signals.find((s) => s.type === "DUPLICATE_SIMILAR")?.points).toBe(15);
    const five = evaluateTransactionRisk({ ...baseInput, duplicateMatchCount: 5 });
    expect(five.signals.find((s) => s.type === "DUPLICATE_SIMILAR")?.points).toBe(25);
  });

  it("flags a frequency burst well above the expected rate and escalates appropriately", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      frequency: { windowCount: 40, expectedWindowCount: 1 }, // ratio 40 -> SEVERE
    });
    expect(result.signals.some((s) => s.type === "FREQUENCY_ANOMALY")).toBe(true);
    expect(result.level).toBe("HIGH");
  });

  it("does not flag frequency for a business whose normal rate is itself high", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      frequency: { windowCount: 500, expectedWindowCount: 480 }, // ratio ~1.04
    });
    expect(result.signals.some((s) => s.type === "FREQUENCY_ANOMALY")).toBe(false);
  });

  it("H: multiple independent anomalies combine and can escalate together", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 20_000, // MODERATE, no floor alone
      duplicateMatchCount: 1,
      frequency: { windowCount: 40, expectedWindowCount: 1 }, // SEVERE -> floors HIGH alone
    });
    const types = result.signals.map((s) => s.type);
    expect(types).toContain("UNUSUAL_AMOUNT");
    expect(types).toContain("DUPLICATE_SIMILAR");
    expect(types).toContain("FREQUENCY_ANOMALY");
    expect(result.level).toBe("HIGH");
  });

  it("caps the final score at 100 no matter how many signals fire", () => {
    const result = evaluateTransactionRisk({
      baseAmount: 1_000_000,
      source: "CSV",
      hasCustomer: true,
      isNewOrInactiveCustomer: true,
      organizationAmountBaseline: { median: 1_000, mad: 150, sampleSize: 50 },
      categoryAmountBaseline: { median: 1_000, mad: 150, sampleSize: 50 },
      customerAmountBaseline: { median: 1_000, mad: 150, sampleSize: 10 },
      frequency: { windowCount: 50, expectedWindowCount: 2 },
      duplicateMatchCount: 10,
      categoryTrend: { currentPeriodTotal: 1_000_000, medianPriorPeriodTotal: 50_000, periodsOfHistory: 6 },
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe("CRITICAL");
  });

  it("L: a customer with no history produces no false CUSTOMER_ANOMALY signal", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      hasCustomer: true,
      customerAmountBaseline: { median: 0, mad: 0, sampleSize: 0 },
    });
    expect(result.signals.some((s) => s.type === "CUSTOMER_ANOMALY")).toBe(false);
  });

  it("flags a customer-specific anomaly independent of org/category history", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      hasCustomer: true,
      baseAmount: 450_000,
      customerAmountBaseline: { median: 30_000, mad: 4_500, sampleSize: 8 },
      organizationAmountBaseline: { median: 400_000, mad: 60_000, sampleSize: 20 },
      categoryAmountBaseline: { median: 400_000, mad: 60_000, sampleSize: 20 },
    });
    expect(result.signals.some((s) => s.type === "CUSTOMER_ANOMALY")).toBe(true);
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(false);
  });

  it("flags a category spending trend anomaly", () => {
    const result = evaluateTransactionRisk({
      ...baseInput,
      categoryTrend: { currentPeriodTotal: 300_000, medianPriorPeriodTotal: 80_000, periodsOfHistory: 3 },
    });
    expect(result.signals.some((s) => s.type === "CATEGORY_ANOMALY")).toBe(true);
  });

  it("gives a small, non-dominant new-customer signal, never a heavy penalty alone", () => {
    const result = evaluateTransactionRisk({ ...baseInput, hasCustomer: true, isNewOrInactiveCustomer: true });
    expect(result.signals).toEqual([{ type: "NEW_CUSTOMER", points: 3, explanation: expect.any(String) }]);
    expect(result.level).toBe("LOW");
  });

  it("J: a plain manual transaction with nothing else unusual carries no significant risk", () => {
    const result = evaluateTransactionRisk({ ...baseInput, source: "MANUAL" });
    expect(result.signals.some((s) => s.type === "MANUAL_ENTRY_CONTEXT")).toBe(false);
    expect(result.level).toBe("LOW");
  });

  it("only adds manual-entry context when another signal has already fired", () => {
    const flagged = evaluateTransactionRisk({ ...baseInput, source: "MANUAL", duplicateMatchCount: 1 });
    expect(flagged.signals.some((s) => s.type === "MANUAL_ENTRY_CONTEXT")).toBe(true);
  });

  it("adds import context instead of manual context for CSV/EXCEL sources", () => {
    const result = evaluateTransactionRisk({ ...baseInput, source: "EXCEL", duplicateMatchCount: 1 });
    expect(result.signals.some((s) => s.type === "IMPORT_CONTEXT")).toBe(true);
    expect(result.signals.some((s) => s.type === "MANUAL_ENTRY_CONTEXT")).toBe(false);
  });

  it("flags an unusually large round-number amount as a weak signal only, never escalating alone", () => {
    // Baseline median equals the amount itself (no real deviation) so
    // only the round-number context signal can fire in isolation.
    const result = evaluateTransactionRisk({
      ...baseInput,
      baseAmount: 50_000,
      organizationAmountBaseline: { median: 50_000, mad: 5_000, sampleSize: 20 },
      categoryAmountBaseline: { median: 50_000, mad: 5_000, sampleSize: 20 },
    });
    const signal = result.signals.find((s) => s.type === "ROUND_NUMBER");
    expect(signal?.points).toBe(3);
    expect(result.level).toBe("LOW");
  });

  it("edge case: zero amount never fires an amount anomaly (only fires upward from baseline)", () => {
    const result = evaluateTransactionRisk({ ...baseInput, baseAmount: 0 });
    expect(result.signals.some((s) => s.type === "UNUSUAL_AMOUNT")).toBe(false);
  });

  it("every point awarded is deterministic given the same input", () => {
    const input: RiskEvaluationInput = { ...baseInput, baseAmount: 200_000, duplicateMatchCount: 2 };
    expect(evaluateTransactionRisk(input)).toEqual(evaluateTransactionRisk(input));
  });
});

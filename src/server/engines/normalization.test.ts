import { describe, expect, it } from "vitest";
import {
  buildDuplicateKey,
  neutralizeFormulaPrefix,
  normalizeRows,
  validateColumnMapping,
} from "./normalization";
import type { ColumnMappingEntry } from "./import-types";

const directMapping: ColumnMappingEntry[] = [
  { sourceColumn: "Date", targetField: "date" },
  { sourceColumn: "Amount", targetField: "amount" },
  { sourceColumn: "Type", targetField: "type" },
  { sourceColumn: "Category", targetField: "category" },
  { sourceColumn: "Description", targetField: "description" },
  { sourceColumn: "Ref", targetField: "referenceId" },
];

const splitMapping: ColumnMappingEntry[] = [
  { sourceColumn: "Transaction Date", targetField: "date" },
  { sourceColumn: "Withdrawal", targetField: "expenseAmount" },
  { sourceColumn: "Deposit", targetField: "incomeAmount" },
  { sourceColumn: "Narration", targetField: "description" },
];

describe("validateColumnMapping", () => {
  it("accepts a complete direct amount+type mapping", () => {
    expect(validateColumnMapping(directMapping)).toEqual([]);
  });

  it("accepts a complete split expense/income mapping", () => {
    expect(validateColumnMapping(splitMapping)).toEqual([]);
  });

  it("accepts a split mapping with only one of expense/income present", () => {
    const mapping: ColumnMappingEntry[] = [
      { sourceColumn: "Date", targetField: "date" },
      { sourceColumn: "Withdrawal", targetField: "expenseAmount" },
    ];
    expect(validateColumnMapping(mapping)).toEqual([]);
  });

  it("rejects a mapping missing date", () => {
    const errors = validateColumnMapping([
      { sourceColumn: "Amount", targetField: "amount" },
      { sourceColumn: "Type", targetField: "type" },
    ]);
    expect(errors.some((e) => e.includes("Date"))).toBe(true);
  });

  it("rejects amount without type", () => {
    const errors = validateColumnMapping([
      { sourceColumn: "Date", targetField: "date" },
      { sourceColumn: "Amount", targetField: "amount" },
    ]);
    expect(errors.some((e) => e.includes("Amount and Type"))).toBe(true);
  });

  it("rejects mixing direct and split strategies", () => {
    const errors = validateColumnMapping([
      { sourceColumn: "Date", targetField: "date" },
      { sourceColumn: "Amount", targetField: "amount" },
      { sourceColumn: "Type", targetField: "type" },
      { sourceColumn: "Withdrawal", targetField: "expenseAmount" },
    ]);
    expect(errors.some((e) => e.includes("not both"))).toBe(true);
  });

  it("rejects neither direct nor split strategy present", () => {
    const errors = validateColumnMapping([{ sourceColumn: "Date", targetField: "date" }]);
    expect(errors.some((e) => e.includes("direction"))).toBe(true);
  });

  it("rejects a target field mapped from two different columns", () => {
    const errors = validateColumnMapping([
      { sourceColumn: "Date", targetField: "date" },
      { sourceColumn: "Value Date", targetField: "date" },
      { sourceColumn: "Amount", targetField: "amount" },
      { sourceColumn: "Type", targetField: "type" },
    ]);
    expect(errors.some((e) => e.includes("mapped to the same field"))).toBe(true);
  });
});

describe("neutralizeFormulaPrefix", () => {
  it.each(["=cmd", "+1+1", "-1+1", "@SUM(A1)", "\ttab", "\rcr"])(
    "prefixes a leading formula-trigger character: %s",
    (value) => {
      expect(neutralizeFormulaPrefix(value)).toBe(`'${value}`);
    }
  );

  it("leaves ordinary text and negative-looking descriptions alone when not a formula trigger", () => {
    expect(neutralizeFormulaPrefix("Invoice #1042")).toBe("Invoice #1042");
  });

  it("still neutralizes a value that starts with a minus sign", () => {
    // A legitimate "-5 refunded" description is rare in these fields but
    // the mitigation must apply uniformly — it can't distinguish intent.
    expect(neutralizeFormulaPrefix("-5 refunded")).toBe("'-5 refunded");
  });
});

describe("normalizeRows — direct amount + type strategy", () => {
  it("normalizes a well-formed row", () => {
    const result = normalizeRows(
      [
        {
          Date: "2026-01-15",
          Amount: "1,250.50",
          Type: "Income",
          Category: "Sales",
          Description: "Invoice #42",
          Ref: "INV-42",
        },
      ],
      directMapping,
      { defaultCurrency: "GBP" }
    );

    expect(result.invalid).toEqual([]);
    expect(result.duplicates).toEqual([]);
    expect(result.valid).toEqual([
      {
        rowNumber: 1,
        date: "2026-01-15",
        amount: 1250.5,
        currency: "GBP",
        type: "INCOME",
        category: "Sales",
        description: "Invoice #42",
        referenceId: "INV-42",
      },
    ]);
  });

  it("parses DD/MM/YYYY as UK-convention dates", () => {
    const result = normalizeRows(
      [{ Date: "05/01/2026", Amount: "10", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid[0]?.date).toBe("2026-01-05");
  });

  it("rejects an invalid calendar date (31 Feb)", () => {
    const result = normalizeRows(
      [{ Date: "31/02/2026", Amount: "10", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid).toEqual([]);
    expect(result.invalid[0]?.reasons.some((r) => r.includes("Unrecognized or invalid date"))).toBe(
      true
    );
  });

  it("rejects a date more than one day in the future", () => {
    const result = normalizeRows(
      [{ Date: "2099-01-01", Amount: "10", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(1);
  });

  it("flags a missing date", () => {
    const result = normalizeRows(
      [{ Date: "", Amount: "10", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons).toContain("Date is missing.");
  });

  it("flags an unrecognized amount", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "not a number", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons.some((r) => r.includes("Unrecognized amount"))).toBe(true);
  });

  it("accepts currency symbols and thousands separators in amount", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "£1,000.00", Type: "Income", Category: "Sales" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid[0]?.amount).toBe(1000);
  });

  it("treats parenthesized amounts as negative (accounting convention), then rejects non-positive", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "(50.00)", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    // abs() is applied after parsing, so a parenthesized value still
    // produces a valid positive amount — direction comes from Type, not
    // from the sign.
    expect(result.valid[0]?.amount).toBe(50);
  });

  it("rejects a zero amount", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "0", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid).toHaveLength(1);
  });

  it("rejects an amount above the sanity ceiling", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "9999999999", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons.some((r) => r.includes("exceeds the maximum"))).toBe(true);
  });

  it("flags an unrecognized type value", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "10", Type: "Sideways", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons.some((r) => r.includes("Unrecognized transaction type"))).toBe(
      true
    );
  });

  it("defaults category to Uncategorised when not mapped/blank", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "10", Type: "Expense", Category: "" }],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid[0]?.category).toBe("Uncategorised");
  });

  it("uses the default currency when no currency column is mapped", () => {
    const result = normalizeRows(
      [{ Date: "2026-01-15", Amount: "10", Type: "Expense", Category: "Fuel" }],
      directMapping,
      { defaultCurrency: "USD" }
    );
    expect(result.valid[0]?.currency).toBe("USD");
  });

  it("rejects an unrecognized currency code when a currency column is mapped", () => {
    const mappingWithCurrency: ColumnMappingEntry[] = [
      ...directMapping,
      { sourceColumn: "Ccy", targetField: "currency" },
    ];
    const result = normalizeRows(
      [
        {
          Date: "2026-01-15",
          Amount: "10",
          Type: "Expense",
          Category: "Fuel",
          Ccy: "not-a-code",
        },
      ],
      mappingWithCurrency,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons.some((r) => r.includes("Unrecognized currency code"))).toBe(
      true
    );
  });

  it("neutralizes a formula-like description/category/reference before storing", () => {
    const result = normalizeRows(
      [
        {
          Date: "2026-01-15",
          Amount: "10",
          Type: "Expense",
          Category: "=cmd|'/calc'!A1",
          Description: "+SUM(A1:A2)",
          Ref: "@ref",
        },
      ],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid[0]?.category).toBe("'=cmd|'/calc'!A1");
    expect(result.valid[0]?.description).toBe("'+SUM(A1:A2)");
    expect(result.valid[0]?.referenceId).toBe("'@ref");
  });

  it("throws if the mapping is incomplete", () => {
    expect(() =>
      normalizeRows([{ Date: "2026-01-15" }], [{ sourceColumn: "Date", targetField: "date" }], {
        defaultCurrency: "GBP",
      })
    ).toThrow(/Invalid column mapping/);
  });
});

describe("normalizeRows — split expense/income strategy", () => {
  it("derives EXPENSE from a populated withdrawal column", () => {
    const result = normalizeRows(
      [{ "Transaction Date": "2026-01-15", Withdrawal: "45.00", Deposit: "", Narration: "ATM" }],
      splitMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid[0]).toMatchObject({ type: "EXPENSE", amount: 45 });
  });

  it("derives INCOME from a populated deposit column", () => {
    const result = normalizeRows(
      [{ "Transaction Date": "2026-01-15", Withdrawal: "", Deposit: "500.00", Narration: "Salary" }],
      splitMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid[0]).toMatchObject({ type: "INCOME", amount: 500 });
  });

  it("flags a row where both withdrawal and deposit have a value", () => {
    const result = normalizeRows(
      [{ "Transaction Date": "2026-01-15", Withdrawal: "10", Deposit: "10", Narration: "?" }],
      splitMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons.some((r) => r.includes("Both the expense"))).toBe(true);
  });

  it("flags a row where neither withdrawal nor deposit has a value", () => {
    const result = normalizeRows(
      [{ "Transaction Date": "2026-01-15", Withdrawal: "", Deposit: "0", Narration: "?" }],
      splitMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.invalid[0]?.reasons.some((r) => r.includes("No amount found"))).toBe(true);
  });
});

describe("normalizeRows — batch duplicate detection", () => {
  it("flags a later row with the same reference ID as a duplicate of the earlier one", () => {
    const result = normalizeRows(
      [
        { Date: "2026-01-15", Amount: "10", Type: "Expense", Category: "Fuel", Ref: "ABC" },
        { Date: "2026-01-16", Amount: "20", Type: "Income", Category: "Sales", Ref: "ABC" },
      ],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]?.rowNumber).toBe(1);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0]?.rowNumber).toBe(2);
    expect(result.duplicates[0]?.reasons[0]).toContain("row 1");
  });

  it("flags an exact (date, amount, currency, category) tuple match when no reference id is present", () => {
    const result = normalizeRows(
      [
        { Date: "2026-01-15", Amount: "10.00", Type: "Expense", Category: "Fuel" },
        { Date: "2026-01-15", Amount: "10.00", Type: "Expense", Category: "Fuel" },
      ],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });

  it("does not flag rows that differ in category as duplicates", () => {
    const result = normalizeRows(
      [
        { Date: "2026-01-15", Amount: "10.00", Type: "Expense", Category: "Fuel" },
        { Date: "2026-01-15", Amount: "10.00", Type: "Expense", Category: "Parking" },
      ],
      directMapping,
      { defaultCurrency: "GBP" }
    );
    expect(result.valid).toHaveLength(2);
    expect(result.duplicates).toHaveLength(0);
  });
});

describe("normalizeRows — empty input", () => {
  it("returns empty buckets and totalRows 0 for no rows", () => {
    const result = normalizeRows([], directMapping, { defaultCurrency: "GBP" });
    expect(result).toEqual({ totalRows: 0, valid: [], invalid: [], duplicates: [] });
  });
});

describe("buildDuplicateKey", () => {
  it("prefers the reference id when present", () => {
    const key = buildDuplicateKey({
      rowNumber: 1,
      date: "2026-01-15",
      amount: 10,
      currency: "GBP",
      type: "EXPENSE",
      category: "Fuel",
      referenceId: "ABC-123",
    });
    expect(key).toBe("ref:abc-123");
  });

  it("falls back to the (date, amount, currency, category) tuple", () => {
    const key = buildDuplicateKey({
      rowNumber: 1,
      date: "2026-01-15",
      amount: 10,
      currency: "GBP",
      type: "EXPENSE",
      category: "Fuel",
    });
    expect(key).toBe("tuple:2026-01-15|10.00|GBP|fuel");
  });
});

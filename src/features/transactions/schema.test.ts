import { describe, it, expect } from "vitest";
import { transactionSchema } from "./schema";

const validInput = {
  date: "2026-01-15",
  amount: "1250.50",
  currency: "gbp",
  type: "INCOME" as const,
  category: "Consulting",
  description: "Invoice #1042",
  referenceId: "INV-1042",
};

describe("transactionSchema", () => {
  it("accepts a fully valid manual entry", () => {
    const result = transactionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1250.5);
      expect(result.data.currency).toBe("GBP"); // uppercased
    }
  });

  it("accepts a minimal entry with only the required fields", () => {
    const result = transactionSchema.safeParse({
      date: "2026-01-15",
      amount: "10",
      currency: "USD",
      type: "EXPENSE",
      category: "Office supplies",
      description: "",
      referenceId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.referenceId).toBeUndefined();
    }
  });

  describe("amount — invalid amounts (brief: 'invalid amounts', 'extreme transaction amounts')", () => {
    it("rejects zero", () => {
      expect(transactionSchema.safeParse({ ...validInput, amount: "0" }).success).toBe(false);
    });

    it("rejects a negative amount", () => {
      expect(transactionSchema.safeParse({ ...validInput, amount: "-50" }).success).toBe(
        false
      );
    });

    it("rejects more than 2 decimal places", () => {
      expect(transactionSchema.safeParse({ ...validInput, amount: "10.999" }).success).toBe(
        false
      );
    });

    it("rejects non-numeric input", () => {
      expect(transactionSchema.safeParse({ ...validInput, amount: "abc" }).success).toBe(
        false
      );
    });

    it("rejects scientific notation smuggled in as a string", () => {
      expect(transactionSchema.safeParse({ ...validInput, amount: "1e10" }).success).toBe(
        false
      );
    });

    it("rejects an extreme amount above the sanity ceiling", () => {
      expect(
        transactionSchema.safeParse({ ...validInput, amount: "9999999999999" }).success
      ).toBe(false);
    });

    it("accepts an amount right at the ceiling", () => {
      expect(
        transactionSchema.safeParse({ ...validInput, amount: "999999999.99" }).success
      ).toBe(true);
    });
  });

  describe("date", () => {
    it("rejects a malformed date string", () => {
      expect(transactionSchema.safeParse({ ...validInput, date: "15/01/2026" }).success).toBe(
        false
      );
    });

    it("rejects a nonsense calendar date", () => {
      expect(transactionSchema.safeParse({ ...validInput, date: "2026-13-40" }).success).toBe(
        false
      );
    });

    it("rejects a date far in the future", () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      const iso = farFuture.toISOString().slice(0, 10);
      expect(transactionSchema.safeParse({ ...validInput, date: iso }).success).toBe(false);
    });

    it("accepts today's date", () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(transactionSchema.safeParse({ ...validInput, date: today }).success).toBe(true);
    });
  });

  describe("currency", () => {
    it("rejects a code that isn't 3 letters", () => {
      expect(transactionSchema.safeParse({ ...validInput, currency: "US" }).success).toBe(
        false
      );
    });

    it("rejects digits", () => {
      expect(transactionSchema.safeParse({ ...validInput, currency: "12A" }).success).toBe(
        false
      );
    });
  });

  describe("category (brief: 'missing fields')", () => {
    it("rejects an empty category", () => {
      expect(transactionSchema.safeParse({ ...validInput, category: "" }).success).toBe(
        false
      );
    });

    it("rejects a category over 100 characters", () => {
      expect(
        transactionSchema.safeParse({ ...validInput, category: "a".repeat(101) }).success
      ).toBe(false);
    });
  });

  describe("type", () => {
    it("rejects a value outside INCOME/EXPENSE", () => {
      expect(transactionSchema.safeParse({ ...validInput, type: "TRANSFER" }).success).toBe(
        false
      );
    });
  });
});

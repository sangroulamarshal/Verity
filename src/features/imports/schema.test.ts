import { describe, expect, it } from "vitest";
import { columnMappingSchema, currencySchema } from "./schema";

describe("currencySchema", () => {
  it("accepts and uppercases a valid 3-letter code", () => {
    expect(currencySchema.parse("gbp")).toBe("GBP");
  });

  it("rejects a code that isn't 3 letters", () => {
    expect(currencySchema.safeParse("GB").success).toBe(false);
    expect(currencySchema.safeParse("GBPX").success).toBe(false);
  });

  it("rejects a code containing digits", () => {
    expect(currencySchema.safeParse("G8P").success).toBe(false);
  });
});

describe("columnMappingSchema", () => {
  it("accepts a well-formed mapping array", () => {
    const result = columnMappingSchema.safeParse([
      { sourceColumn: "Date", targetField: "date" },
      { sourceColumn: "Amount", targetField: "amount" },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(columnMappingSchema.safeParse([]).success).toBe(false);
  });

  it("rejects an unrecognized target field", () => {
    const result = columnMappingSchema.safeParse([
      { sourceColumn: "Date", targetField: "notAField" },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects an entry missing sourceColumn", () => {
    const result = columnMappingSchema.safeParse([{ targetField: "date" }]);
    expect(result.success).toBe(false);
  });

  it("rejects more than 64 entries", () => {
    const tooMany = Array.from({ length: 65 }, (_, i) => ({
      sourceColumn: `Column ${i}`,
      targetField: "description" as const,
    }));
    expect(columnMappingSchema.safeParse(tooMany).success).toBe(false);
  });

  it("rejects a non-array payload (guards against malformed JSON.parse results)", () => {
    expect(columnMappingSchema.safeParse({ sourceColumn: "Date", targetField: "date" }).success).toBe(
      false
    );
    expect(columnMappingSchema.safeParse("not an array").success).toBe(false);
    expect(columnMappingSchema.safeParse(null).success).toBe(false);
  });
});

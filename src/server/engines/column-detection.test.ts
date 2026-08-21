import { describe, expect, it } from "vitest";
import { suggestColumnMapping } from "./column-detection";

describe("suggestColumnMapping", () => {
  it("matches common bank-export header names", () => {
    const suggestions = suggestColumnMapping([
      "Transaction Date",
      "Narration",
      "Withdrawal",
      "Deposit",
      "Txn ID",
    ]);

    expect(suggestions).toContainEqual({ sourceColumn: "Transaction Date", targetField: "date" });
    expect(suggestions).toContainEqual({ sourceColumn: "Narration", targetField: "description" });
    expect(suggestions).toContainEqual({ sourceColumn: "Withdrawal", targetField: "expenseAmount" });
    expect(suggestions).toContainEqual({ sourceColumn: "Deposit", targetField: "incomeAmount" });
    expect(suggestions).toContainEqual({ sourceColumn: "Txn ID", targetField: "referenceId" });
  });

  it("matches a simple Amount + Type export", () => {
    const suggestions = suggestColumnMapping(["Date", "Amount", "Type", "Category"]);

    expect(suggestions).toContainEqual({ sourceColumn: "Date", targetField: "date" });
    expect(suggestions).toContainEqual({ sourceColumn: "Amount", targetField: "amount" });
    expect(suggestions).toContainEqual({ sourceColumn: "Type", targetField: "type" });
    expect(suggestions).toContainEqual({ sourceColumn: "Category", targetField: "category" });
  });

  it("is case- and punctuation-insensitive", () => {
    const suggestions = suggestColumnMapping(["  TRANSACTION-DATE  ", "ref_no"]);

    expect(suggestions).toContainEqual({
      sourceColumn: "  TRANSACTION-DATE  ",
      targetField: "date",
    });
    expect(suggestions).toContainEqual({ sourceColumn: "ref_no", targetField: "referenceId" });
  });

  it("never assigns a target field to more than one column", () => {
    // Both headers alias to "date" — only the first (left-most) should win.
    const suggestions = suggestColumnMapping(["Date", "Value Date", "Posting Date"]);

    const dateMatches = suggestions.filter((s) => s.targetField === "date");
    expect(dateMatches).toHaveLength(1);
    expect(dateMatches[0].sourceColumn).toBe("Date");
  });

  it("never assigns a column to more than one target field", () => {
    // A header can only satisfy one alias list even if it happens to be
    // considered under an earlier target field first.
    const suggestions = suggestColumnMapping(["Amount"]);
    const usingAmountColumn = suggestions.filter((s) => s.sourceColumn === "Amount");
    expect(usingAmountColumn).toHaveLength(1);
  });

  it("leaves unrecognized headers unmapped", () => {
    const suggestions = suggestColumnMapping(["Foo Bar Baz", "Something Else"]);
    expect(suggestions).toHaveLength(0);
  });

  it("returns an empty array for an empty header list", () => {
    expect(suggestColumnMapping([])).toEqual([]);
  });

  it("ignores blank header strings", () => {
    const suggestions = suggestColumnMapping(["", "   ", "Date"]);
    expect(suggestions).toEqual([{ sourceColumn: "Date", targetField: "date" }]);
  });
});

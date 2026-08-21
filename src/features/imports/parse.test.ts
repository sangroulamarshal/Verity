import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { ImportFileError, MAX_IMPORT_ROWS, parseImportFile } from "./parse";

function csvBuffer(text: string): Buffer {
  return Buffer.from(text, "utf-8");
}

function xlsxBuffer(rows: (string | number)[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

describe("parseImportFile — CSV", () => {
  it("parses headers and rows", () => {
    const result = parseImportFile(
      csvBuffer("Date,Amount,Type\n2026-01-15,10.00,Expense\n2026-01-16,20.00,Income\n"),
      "statement.csv"
    );
    expect(result.headers).toEqual(["Date", "Amount", "Type"]);
    expect(result.rows).toEqual([
      { Date: "2026-01-15", Amount: "10.00", Type: "Expense" },
      { Date: "2026-01-16", Amount: "20.00", Type: "Income" },
    ]);
  });

  it("skips blank lines", () => {
    const result = parseImportFile(
      csvBuffer("Date,Amount\n2026-01-15,10.00\n\n2026-01-16,20.00\n"),
      "statement.csv"
    );
    expect(result.rows).toHaveLength(2);
  });

  it("rejects an empty file", () => {
    expect(() => parseImportFile(csvBuffer(""), "empty.csv")).toThrow(ImportFileError);
  });

  it("rejects a header-only file with no data rows", () => {
    expect(() => parseImportFile(csvBuffer("Date,Amount\n"), "headers-only.csv")).toThrow(
      /no data rows/
    );
  });

  it("rejects a file over the row cap", () => {
    const header = "Date,Amount\n";
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => "2026-01-15,10.00").join("\n");
    expect(() => parseImportFile(csvBuffer(header + rows), "big.csv")).toThrow(/too many rows/);
  });

  it("rejects an unsupported file extension", () => {
    expect(() => parseImportFile(csvBuffer("Date,Amount\n1,2\n"), "statement.txt")).toThrow(
      /Unsupported file type/
    );
  });
});

describe("parseImportFile — XLSX", () => {
  it("parses headers and rows from the first sheet", () => {
    const buffer = xlsxBuffer([
      ["Date", "Amount", "Type"],
      ["2026-01-15", 10, "Expense"],
      ["2026-01-16", 20, "Income"],
    ]);
    const result = parseImportFile(buffer, "statement.xlsx");
    expect(result.headers).toEqual(["Date", "Amount", "Type"]);
    expect(result.rows).toEqual([
      { Date: "2026-01-15", Amount: "10", Type: "Expense" },
      { Date: "2026-01-16", Amount: "20", Type: "Income" },
    ]);
  });

  it("rejects a corrupt/non-spreadsheet buffer with the .xlsx extension", () => {
    expect(() => parseImportFile(Buffer.from("not a real xlsx file"), "fake.xlsx")).toThrow(
      ImportFileError
    );
  });
});

describe("parseImportFile — size limit", () => {
  it("rejects a file over the size cap", () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, "a");
    expect(() => parseImportFile(oversized, "big.csv")).toThrow(/too large/);
  });
});

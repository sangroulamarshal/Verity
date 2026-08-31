import "server-only";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedFile } from "@/server/engines/import-types";
import { detectHeaderRowIndex } from "@/server/engines/column-detection";

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_ROWS = 5_000;

export class ImportFileError extends Error {}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => String(cell ?? "").trim() === "");
}

function toRows(headers: string[], dataRows: unknown[][]): Record<string, string>[] {
  return dataRows
    .filter((row) => !isBlankRow(row))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        const cell = row[i];
        record[header] = cell === undefined || cell === null ? "" : String(cell).trim();
      });
      return record;
    });
}

/**
 * Parses an uploaded CSV or XLSX file into generic, still source-shaped
 * rows — `Record<sourceColumn, rawString>` — with no interpretation of
 * what any column *means* yet; that's the normalization engine's job
 * (server/engines/normalization.ts). This is the one place
 * format-specific parsing libraries (papaparse, SheetJS) are used —
 * everything downstream of this function is format-agnostic, which is
 * what "the system must not depend on the original source format after
 * normalization" actually means in code, not just in principle.
 *
 * Deliberately conservative for security:
 * - Rejects files over the size and row-count caps before doing any
 *   real parsing work — a resource-exhaustion guard, since an import
 *   runs synchronously inside one request (there's no background job
 *   queue in this MVP).
 * - Only `.csv`, `.xlsx`, and `.xls` extensions are accepted.
 * - XLSX cells are read as cached values, never evaluated as formulas —
 *   this is inherent to SheetJS's `xlsx` package (it has no
 *   formula-execution engine), not a configuration choice made here,
 *   but it's the property that makes reading an untrusted spreadsheet
 *   safe from a malicious-formula perspective. Values that could
 *   themselves be interpreted as a formula if re-exported later (a
 *   leading =, +, -, or @) are neutralized downstream, in the
 *   normalization engine, at the point they're assigned to a
 *   description/category/reference field.
 */
export function parseImportFile(buffer: Buffer, filename: string): ParsedFile {
  if (buffer.byteLength === 0) {
    throw new ImportFileError("The file is empty.");
  }
  if (buffer.byteLength > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new ImportFileError(
      `File is too large. The maximum size is ${Math.floor(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024))} MB.`
    );
  }

  const extension = filename.toLowerCase().split(".").pop();
  let headers: string[];
  let dataRows: unknown[][];

  if (extension === "csv") {
    const result = Papa.parse<string[]>(buffer.toString("utf-8"), {
      skipEmptyLines: true,
    });
    if (result.errors.length > 0) {
      throw new ImportFileError("The CSV file could not be parsed. Check that it's well-formed.");
    }
    if (result.data.length === 0) {
      throw new ImportFileError("The file has no rows.");
    }
    // Not always row 0 — some exports (bank/wallet statements in
    // particular) prepend summary rows before the real header row. See
    // detectHeaderRowIndex's own comment for why this is safe for
    // ordinary files too (it falls back to row 0 when nothing scores).
    const headerIndex = detectHeaderRowIndex(result.data);
    headers = result.data[headerIndex].map((h) => String(h ?? "").trim());
    dataRows = result.data.slice(headerIndex + 1);
  } else if (extension === "xlsx" || extension === "xls") {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    } catch {
      throw new ImportFileError(
        "The Excel file could not be read. Check that it's a valid .xlsx or .xls file."
      );
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new ImportFileError("The workbook has no sheets.");

    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
    });
    if (rows.length === 0) {
      throw new ImportFileError("The file has no rows.");
    }
    const headerIndex = detectHeaderRowIndex(rows);
    headers = rows[headerIndex].map((h) => String(h ?? "").trim());
    dataRows = rows.slice(headerIndex + 1);
  } else {
    throw new ImportFileError("Unsupported file type. Upload a .csv, .xlsx, or .xls file.");
  }

  if (headers.length === 0 || headers.every((h) => h === "")) {
    throw new ImportFileError("Couldn't find a header row.");
  }

  const rows = toRows(headers, dataRows);

  if (rows.length === 0) {
    throw new ImportFileError("The file has a header row but no data rows.");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ImportFileError(
      `File has too many rows (${rows.length}). The maximum is ${MAX_IMPORT_ROWS.toLocaleString()} per import.`
    );
  }

  return { headers, rows };
}

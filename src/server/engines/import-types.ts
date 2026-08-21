/**
 * Shared types for the CSV/Excel import pipeline, used by both the pure
 * normalization engine (this directory) and the imports feature's Zod
 * schema/actions. Kept in the engine layer rather than in
 * features/imports — engines are the innermost layer with no
 * dependencies on features (see docs/ARCHITECTURE.md's layering rule),
 * and both sides need to agree on this shape, so it lives on the side
 * features are already allowed to depend on.
 */

export const IMPORT_TARGET_FIELDS = [
  "date",
  "amount",
  "type",
  "expenseAmount",
  "incomeAmount",
  "currency",
  "category",
  "description",
  "referenceId",
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

/** Human-readable labels for the column-mapping UI. */
export const IMPORT_TARGET_FIELD_LABELS: Record<ImportTargetField, string> = {
  date: "Date",
  amount: "Amount",
  type: "Type (Income / Expense)",
  expenseAmount: "Amount — expense/withdrawal column",
  incomeAmount: "Amount — income/deposit column",
  currency: "Currency",
  category: "Category",
  description: "Description",
  referenceId: "Reference",
};

/** Fields a row can't be normalized without — used to prompt the user
 * before they've mapped enough columns to preview anything. */
export const REQUIRED_TARGET_FIELDS: ImportTargetField[] = ["date"];

export interface ColumnMappingEntry {
  sourceColumn: string;
  targetField: ImportTargetField;
}

/** The output of file parsing (parse.ts) — generic, still source-shaped
 * rows with no interpretation of what any column means yet. */
export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

/** A single canonical transaction produced by the normalization engine.
 * `rowNumber` is 1-based and refers to the data row in the source file
 * (excluding the header), purely for user-facing reporting — it never
 * reaches the database. */
export interface NormalizedTransactionRow {
  rowNumber: number;
  date: string;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description?: string;
  referenceId?: string;
}

export interface RowIssue {
  rowNumber: number;
  reasons: string[];
}

export interface DuplicateCandidateRow extends NormalizedTransactionRow {
  reasons: string[];
}

export interface NormalizationResult {
  totalRows: number;
  valid: NormalizedTransactionRow[];
  invalid: RowIssue[];
  /** Within-file duplicate candidates only — see
   * server/services/imports.ts for the additional check against the
   * organization's existing transactions, which needs database access
   * the engine deliberately doesn't have. */
  duplicates: DuplicateCandidateRow[];
}

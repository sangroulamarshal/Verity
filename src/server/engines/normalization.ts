import type {
  ColumnMappingEntry,
  DuplicateCandidateRow,
  ImportTargetField,
  NormalizationResult,
  NormalizedTransactionRow,
  RowIssue,
} from "./import-types";

// Kept in sync with features/transactions/schema.ts's MAX_AMOUNT — the
// same sanity ceiling applies to every transaction regardless of source.
// Duplicated rather than shared because engines must not import from
// features/ (see docs/ARCHITECTURE.md's layering rule); the features
// layer depends on engines, not the other way round.
const MAX_AMOUNT = 999_999_999.99;
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

const INCOME_TYPE_VALUES = new Set(["income", "credit", "in", "cr", "deposit"]);
const EXPENSE_TYPE_VALUES = new Set(["expense", "debit", "out", "dr", "withdrawal"]);

/**
 * Neutralizes a value that could be interpreted as a spreadsheet formula
 * if it were ever exported back out and reopened in Excel — a cell
 * starting with =, +, -, or @ can trigger formula execution ("CSV
 * injection"). Verity doesn't export transactions today, but the brief
 * lists malicious spreadsheet formulas as a threat to protect against,
 * and this is the point where untrusted file content enters the system,
 * so it's neutralized once, here, rather than left for a future export
 * feature to have to remember. A leading apostrophe is how Excel itself
 * marks a cell as literal text, so this preserves the visible value.
 */
export function neutralizeFormulaPrefix(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cleanCell(value: string | undefined): string {
  return (value ?? "").trim();
}

/**
 * Checks that a confirmed column mapping is complete enough to
 * normalize every row, before any row is processed. `date` is always
 * required. Direction must be expressed exactly one way: either a
 * single `amount` column paired with a `type` column, or one/both of
 * `expenseAmount` (e.g. "Withdrawal") / `incomeAmount` (e.g. "Deposit")
 * — mixing the two strategies, or providing neither, is rejected here
 * rather than guessed at per row.
 */
export function validateColumnMapping(mapping: ColumnMappingEntry[]): string[] {
  const errors: string[] = [];
  const targetFields = mapping.map((m) => m.targetField);
  const has = (field: ImportTargetField) => targetFields.includes(field);

  const seen = new Set<ImportTargetField>();
  for (const field of targetFields) {
    if (seen.has(field)) {
      errors.push(`More than one column is mapped to the same field ("${field}").`);
    }
    seen.add(field);
  }

  if (!has("date")) {
    errors.push("Map a column to Date.");
  }

  const hasDirect = has("amount") || has("type");
  const hasSplit = has("expenseAmount") || has("incomeAmount");

  if (hasDirect && hasSplit) {
    errors.push(
      "Map either a single Amount + Type column pair, or expense/income columns — not both."
    );
  } else if (hasDirect && !(has("amount") && has("type"))) {
    errors.push("Amount and Type must both be mapped together.");
  } else if (!hasDirect && !hasSplit) {
    errors.push(
      "Map an Amount + Type column pair, or an expense/income column, so transaction direction can be determined."
    );
  }

  return errors;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[£$€,\s]/g, "")
    .replace(/^\((.+)\)$/, "-$1"); // accounting negative: (123.45) -> -123.45

  if (cleaned === "" || cleaned === "-") return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseDirection(raw: string): "INCOME" | "EXPENSE" | null {
  const normalized = raw.trim().toLowerCase();
  if (INCOME_TYPE_VALUES.has(normalized)) return "INCOME";
  if (EXPENSE_TYPE_VALUES.has(normalized)) return "EXPENSE";
  return null;
}

const DATE_PATTERNS: Array<{ regex: RegExp; toIso: (m: RegExpMatchArray) => string }> = [
  {
    // ISO — passthrough.
    regex: /^(\d{4})-(\d{2})-(\d{2})$/,
    toIso: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  {
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY — UK convention, matching the
    // rest of the app's GBP-first defaults. A genuinely ambiguous date
    // (e.g. 03/04/2026) is resolved this way consistently rather than
    // guessed per row; a day > 12 simply disambiguates itself.
    regex: /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/,
    toIso: (m) => `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`,
  },
];

function parseImportDate(raw: string): string | null {
  const trimmed = raw.trim();

  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (!match) continue;

    const iso = pattern.toIso(match);
    const [yearStr, monthStr, dayStr] = iso.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (year < MIN_YEAR || year > MAX_YEAR) return null;

    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    // Guards against e.g. 31/02/2026 silently rolling over into March.
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    const oneDayFromNow = new Date();
    oneDayFromNow.setUTCDate(oneDayFromNow.getUTCDate() + 1);
    if (date.getTime() > oneDayFromNow.getTime()) return null;

    return iso;
  }

  return null;
}

function buildLookup(
  row: Record<string, string>,
  mapping: ColumnMappingEntry[]
): Map<ImportTargetField, string> {
  const lookup = new Map<ImportTargetField, string>();
  for (const entry of mapping) {
    const value = row[entry.sourceColumn];
    if (value !== undefined) lookup.set(entry.targetField, value);
  }
  return lookup;
}

export interface NormalizeRowsOptions {
  /** Used for every row unless a `currency` column is itself mapped —
   * most bank/accounting exports don't carry a currency column at all. */
  defaultCurrency: string;
}

/**
 * The normalization engine's core function — turns already-parsed,
 * still source-shaped rows (`Record<sourceColumn, rawString>`, from
 * either a CSV or an XLSX sheet; parse.ts has already erased that
 * distinction by this point) into canonical `NormalizedTransactionRow`s.
 * Only within-file duplicate detection happens here — flagging
 * duplicates against the organization's *existing* transactions needs a
 * database read, which is layered on afterwards in
 * server/services/imports.ts, using `buildDuplicateKey` below so both
 * checks apply the identical rule.
 *
 * Throws if the mapping itself is incomplete (see
 * `validateColumnMapping`) — callers are expected to check that first
 * and never reach here with a mapping that can't possibly normalize a
 * row, so this is a programming-error guard, not a row-level validation
 * outcome.
 */
export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMappingEntry[],
  options: NormalizeRowsOptions
): NormalizationResult {
  const mappingErrors = validateColumnMapping(mapping);
  if (mappingErrors.length > 0) {
    throw new Error(`Invalid column mapping: ${mappingErrors.join(" ")}`);
  }

  const useSplitAmount = mapping.some(
    (m) => m.targetField === "expenseAmount" || m.targetField === "incomeAmount"
  );

  const candidates: NormalizedTransactionRow[] = [];
  const invalid: RowIssue[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const lookup = buildLookup(row, mapping);
    const reasons: string[] = [];

    const rawDate = cleanCell(lookup.get("date"));
    const isoDate = rawDate ? parseImportDate(rawDate) : null;
    if (!rawDate) reasons.push("Date is missing.");
    else if (!isoDate) reasons.push(`Unrecognized or invalid date: "${rawDate}".`);

    let amount: number | null = null;
    let type: "INCOME" | "EXPENSE" | null = null;

    if (useSplitAmount) {
      const expenseRaw = cleanCell(lookup.get("expenseAmount"));
      const incomeRaw = cleanCell(lookup.get("incomeAmount"));
      const expenseValue = expenseRaw ? parseAmount(expenseRaw) : null;
      const incomeValue = incomeRaw ? parseAmount(incomeRaw) : null;
      const hasExpense = expenseValue !== null && expenseValue !== 0;
      const hasIncome = incomeValue !== null && incomeValue !== 0;

      if (hasExpense && hasIncome) {
        reasons.push("Both the expense/withdrawal and income/deposit columns have a value.");
      } else if (hasExpense) {
        amount = Math.abs(expenseValue as number);
        type = "EXPENSE";
      } else if (hasIncome) {
        amount = Math.abs(incomeValue as number);
        type = "INCOME";
      } else {
        reasons.push("No amount found in either the expense/withdrawal or income/deposit column.");
      }
    } else {
      const rawAmount = cleanCell(lookup.get("amount"));
      const rawType = cleanCell(lookup.get("type"));
      const parsedAmount = rawAmount ? parseAmount(rawAmount) : null;
      const parsedType = rawType ? parseDirection(rawType) : null;

      if (!rawAmount) reasons.push("Amount is missing.");
      else if (parsedAmount === null) reasons.push(`Unrecognized amount: "${rawAmount}".`);

      if (!rawType) reasons.push("Type is missing.");
      else if (!parsedType) reasons.push(`Unrecognized transaction type: "${rawType}".`);

      if (parsedAmount !== null && parsedType) {
        amount = Math.abs(parsedAmount);
        type = parsedType;
      }
    }

    if (amount !== null && amount <= 0) {
      reasons.push("Amount must be greater than zero.");
      amount = null;
    }
    if (amount !== null && amount > MAX_AMOUNT) {
      reasons.push(`Amount exceeds the maximum of ${MAX_AMOUNT.toLocaleString()}.`);
      amount = null;
    }

    const rawCurrency = cleanCell(lookup.get("currency"));
    let currency = options.defaultCurrency;
    if (rawCurrency) {
      const upper = rawCurrency.toUpperCase();
      if (/^[A-Z]{3}$/.test(upper)) currency = upper;
      else reasons.push(`Unrecognized currency code: "${rawCurrency}".`);
    }

    const rawCategory = cleanCell(lookup.get("category"));
    const category = neutralizeFormulaPrefix(rawCategory || "Uncategorised").slice(0, 100);

    const rawDescription = cleanCell(lookup.get("description"));
    const description = rawDescription
      ? neutralizeFormulaPrefix(rawDescription).slice(0, 2000)
      : undefined;

    const rawReferenceId = cleanCell(lookup.get("referenceId"));
    const referenceId = rawReferenceId
      ? neutralizeFormulaPrefix(rawReferenceId).slice(0, 255)
      : undefined;

    if (reasons.length > 0 || !isoDate || amount === null || !type) {
      invalid.push({ rowNumber, reasons });
      return;
    }

    candidates.push({
      rowNumber,
      date: isoDate,
      amount,
      currency,
      type,
      category,
      description,
      referenceId,
    });
  });

  const { valid, duplicates } = flagBatchDuplicates(candidates);

  return { totalRows: rows.length, valid, invalid, duplicates };
}

/**
 * The comparison key two rows are considered "the same transaction" by:
 * an exact reference ID match if both rows have one, otherwise the
 * (date, amount, currency, category) tuple. Exported so
 * server/services/imports.ts can build the identical key from existing
 * database rows when checking for duplicates against import history —
 * both checks must apply exactly the same rule, or a row could be
 * flagged one way in-file and another way against history.
 */
export function buildDuplicateKey(row: NormalizedTransactionRow): string {
  if (row.referenceId) return `ref:${row.referenceId.trim().toLowerCase()}`;
  return `tuple:${row.date}|${row.amount.toFixed(2)}|${row.currency}|${row.category.trim().toLowerCase()}`;
}

function flagBatchDuplicates(rows: NormalizedTransactionRow[]): {
  valid: NormalizedTransactionRow[];
  duplicates: DuplicateCandidateRow[];
} {
  const firstSeenAtRow = new Map<string, number>();
  const valid: NormalizedTransactionRow[] = [];
  const duplicates: DuplicateCandidateRow[] = [];

  for (const row of rows) {
    const key = buildDuplicateKey(row);
    const firstRow = firstSeenAtRow.get(key);
    if (firstRow === undefined) {
      firstSeenAtRow.set(key, row.rowNumber);
      valid.push(row);
    } else {
      duplicates.push({ ...row, reasons: [`Matches row ${firstRow} in this file.`] });
    }
  }

  return { valid, duplicates };
}

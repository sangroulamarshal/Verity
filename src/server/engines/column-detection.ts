import {
  IMPORT_TARGET_FIELDS,
  type ColumnMappingEntry,
  type ImportTargetField,
} from "./import-types";

// Alias lists are deliberately exact-match-only (after normalization),
// not fuzzy — a wrong guess here is worse than no guess, since the user
// reviews and can always remap in the UI before anything is written.
const ALIASES: Record<ImportTargetField, string[]> = {
  date: [
    "date",
    "transactiondate",
    "txndate",
    "valuedate",
    "postingdate",
    "postdate",
    // Wallet/mobile-money exports commonly combine date+time under one
    // header (e.g. eSewa's "Date Time"); the time-of-day itself is
    // stripped later in normalization.ts's date parser.
    "datetime",
    "transactiondatetime",
  ],
  amount: ["amount", "transactionamount", "value", "amt"],
  type: ["type", "transactiontype", "direction", "drcr"],
  expenseAmount: [
    "withdrawal",
    "debit",
    "moneyout",
    "paidout",
    "withdrawalamount",
    "debitamount",
    // Common short forms on statements that split Dr/Cr into their own
    // columns instead of a single signed "Amount" column.
    "dr",
    "drs",
  ],
  incomeAmount: [
    "deposit",
    "credit",
    "moneyin",
    "paidin",
    "depositamount",
    "creditamount",
    "cr",
    "crs",
  ],
  currency: ["currency", "ccy", "currencycode"],
  category: ["category", "tag", "transactioncategory"],
  description: ["description", "narration", "memo", "details", "particulars", "note", "notes"],
  referenceId: [
    "reference",
    "referenceid",
    "referencecode",
    "refcode",
    "refno",
    "txnid",
    "transactionid",
    "chequeno",
    "chequenumber",
    "ref",
  ],
};

function normalize(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Best-effort column-mapping suggestion from a file's header row — the
 * "DETECT COLUMNS" step of the import flow. Each target field is
 * assigned to at most one source column, and each source column is used
 * for at most one target field: if two headers both match the same
 * target's aliases, only the first (left-most) wins the suggestion, and
 * a header that's already claimed a target is not considered again for
 * another one.
 */
export function suggestColumnMapping(headers: string[]): ColumnMappingEntry[] {
  const suggestions: ColumnMappingEntry[] = [];
  const claimedTargets = new Set<ImportTargetField>();
  const claimedHeaders = new Set<string>();

  for (const header of headers) {
    if (claimedHeaders.has(header)) continue;
    const normalized = normalize(header);
    if (!normalized) continue;

    for (const targetField of IMPORT_TARGET_FIELDS) {
      if (claimedTargets.has(targetField)) continue;
      if (ALIASES[targetField].includes(normalized)) {
        suggestions.push({ sourceColumn: header, targetField });
        claimedTargets.add(targetField);
        claimedHeaders.add(header);
        break;
      }
    }
  }

  return suggestions;
}

/**
 * Finds which row in a raw sheet is the real header row, instead of
 * assuming it's always row 0. Statement exports from banks and mobile
 * wallets commonly prepend several summary rows (account holder,
 * statement period, generated-on timestamp) before the actual column
 * headers — parseImportFile previously took row 0 unconditionally,
 * which misread that preamble as the header row entirely.
 *
 * Scores each of the first `maxRowsToScan` rows by how many cells match
 * a known column alias (see ALIASES above) — this is the dominant
 * signal, since a preamble row essentially never contains recognizable
 * column names — with the count of non-blank cells as a tiebreaker
 * between rows that score equally on aliases (e.g. an all-alias-miss
 * file, where the header row is still the densest row). Falls back to
 * row 0 when nothing scores above zero, so a file with unrecognized
 * header names and no preamble behaves exactly as before.
 */
export function detectHeaderRowIndex(rows: unknown[][], maxRowsToScan = 25): number {
  let bestIndex = 0;
  let bestScore = -1;

  const limit = Math.min(rows.length, maxRowsToScan);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map((cell) => String(cell ?? "").trim());
    const nonBlankCount = cells.filter((cell) => cell !== "").length;
    if (nonBlankCount === 0) continue;

    const aliasMatchCount = suggestColumnMapping(cells).length;
    // Alias matches dominate; non-blank density only breaks ties among
    // rows with the same (often zero) alias-match count.
    const score = aliasMatchCount * 100 + nonBlankCount;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

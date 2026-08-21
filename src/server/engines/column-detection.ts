import {
  IMPORT_TARGET_FIELDS,
  type ColumnMappingEntry,
  type ImportTargetField,
} from "./import-types";

// Alias lists are deliberately exact-match-only (after normalization),
// not fuzzy — a wrong guess here is worse than no guess, since the user
// reviews and can always remap in the UI before anything is written.
const ALIASES: Record<ImportTargetField, string[]> = {
  date: ["date", "transactiondate", "txndate", "valuedate", "postingdate", "postdate"],
  amount: ["amount", "transactionamount", "value", "amt"],
  type: ["type", "transactiontype", "direction", "drcr"],
  expenseAmount: [
    "withdrawal",
    "debit",
    "moneyout",
    "paidout",
    "withdrawalamount",
    "debitamount",
  ],
  incomeAmount: ["deposit", "credit", "moneyin", "paidin", "depositamount", "creditamount"],
  currency: ["currency", "ccy", "currencycode"],
  category: ["category", "tag", "transactioncategory"],
  description: ["description", "narration", "memo", "details", "particulars", "note", "notes"],
  referenceId: [
    "reference",
    "referenceid",
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

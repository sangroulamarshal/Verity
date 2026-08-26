import "server-only";
import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { imports, importMappings, transactions } from "@/db/schema";
import { buildDuplicateKey } from "@/server/engines/normalization";
import { getExchangeRate } from "./fx";
import { convertAmount } from "@/lib/money";
import type {
  ColumnMappingEntry,
  DuplicateCandidateRow,
  NormalizedTransactionRow,
} from "@/server/engines/import-types";

export type ImportRecord = typeof imports.$inferSelect;

/**
 * Cross-checks already-normalized, already batch-deduplicated candidate
 * rows against this organization's *existing* transactions — the part
 * of duplicate detection the pure engine can't do on its own, since it
 * has no database access. Uses the same `buildDuplicateKey` the engine
 * uses for within-file duplicates, so a row is judged "the same
 * transaction" by one consistent rule everywhere: an exact reference ID
 * match, or the (date, amount, currency, category) tuple.
 *
 * Narrows the existing-transaction query to the batch's own date range
 * (plus an explicit reference-ID lookup) rather than scanning the whole
 * organization's transaction history, since a match outside that range
 * — for the date component of the key — isn't possible.
 *
 * Every read here is scoped by `organizationId`, sourced by the caller
 * from the authenticated session — same pattern as every other query in
 * server/services, see docs/ARCHITECTURE.md.
 */
export async function flagExistingDuplicates(
  organizationId: string,
  candidates: NormalizedTransactionRow[]
): Promise<{ valid: NormalizedTransactionRow[]; duplicates: DuplicateCandidateRow[] }> {
  if (candidates.length === 0) {
    return { valid: [], duplicates: [] };
  }

  const referenceIds = [
    ...new Set(candidates.map((c) => c.referenceId).filter((v): v is string => !!v)),
  ];
  const dates = candidates.map((c) => c.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const orgScope = eq(transactions.organizationId, organizationId);
  const dateRangeMatch = and(orgScope, gte(transactions.date, minDate), lte(transactions.date, maxDate));
  const referenceMatch =
    referenceIds.length > 0 ? and(orgScope, inArray(transactions.referenceId, referenceIds)) : null;

  const existingRows = await db
    .select({
      date: transactions.date,
      amount: transactions.amount,
      currency: transactions.currency,
      category: transactions.category,
      referenceId: transactions.referenceId,
    })
    .from(transactions)
    .where(referenceMatch ? or(dateRangeMatch, referenceMatch) : dateRangeMatch);

  const existingKeys = new Set(
    existingRows.map((row) =>
      buildDuplicateKey({
        rowNumber: 0,
        date: row.date,
        amount: Number(row.amount),
        currency: row.currency,
        category: row.category,
        referenceId: row.referenceId ?? undefined,
        // Direction never participates in the duplicate key — omitted
        // from the comparison, so this placeholder value is arbitrary.
        type: "EXPENSE",
      })
    )
  );

  const valid: NormalizedTransactionRow[] = [];
  const duplicates: DuplicateCandidateRow[] = [];

  for (const candidate of candidates) {
    if (existingKeys.has(buildDuplicateKey(candidate))) {
      duplicates.push({
        ...candidate,
        reasons: ["Matches a transaction already recorded for this organization."],
      });
    } else {
      valid.push(candidate);
    }
  }

  return { valid, duplicates };
}

export interface CommitImportInput {
  filename: string;
  source: "CSV" | "EXCEL";
  mapping: ColumnMappingEntry[];
  /** Rows actually being written — already filtered for whether
   * duplicates should be included, by the caller. */
  rowsToInsert: NormalizedTransactionRow[];
  totalRowCount: number;
  invalidRowCount: number;
  /** All rows that passed field-level validation, whether or not they
   * were then flagged as a duplicate — i.e. `totalRowCount -
   * invalidRowCount`. Reported on the `imports` record independently of
   * how many were actually inserted. */
  validRowCount: number;
  duplicateRowCount: number;
}

/**
 * The NORMALIZE -> SAVE step. Everything before this call (parsing,
 * mapping, preview, both duplicate checks) has already run and the user
 * has confirmed; this function's only job is to write the result
 * atomically. The transaction inserts, the `imports` audit row, and the
 * `import_mappings` rows describing what mapping was used all happen in
 * one database transaction, so a failure partway through can't leave a
 * partial import with no matching `imports` record to explain it.
 */
export async function commitImport(
  organizationId: string,
  organizationBaseCurrency: string,
  userId: string,
  input: CommitImportInput
): Promise<ImportRecord> {
  // One FX lookup per distinct currency in the batch, not one per row —
  // a 500-row CSV in a single currency should cost one rate lookup
  // (cached in fx_rates besides), not 500. Each row still gets its own
  // stored exchangeRateTime, since they all share the same lookup.
  const distinctCurrencies = [...new Set(input.rowsToInsert.map((row) => row.currency))];
  const rateByCurrency = new Map(
    await Promise.all(
      distinctCurrencies.map(
        async (currency) =>
          [currency, await getExchangeRate(currency, organizationBaseCurrency)] as const
      )
    )
  );

  return db.transaction(async (tx) => {
    const [importRow] = await tx
      .insert(imports)
      .values({
        organizationId,
        userId,
        filename: input.filename,
        source: input.source,
        rowCount: input.totalRowCount,
        validRowCount: input.validRowCount,
        invalidRowCount: input.invalidRowCount,
        duplicateRowCount: input.duplicateRowCount,
        insertedRowCount: input.rowsToInsert.length,
      })
      .returning();

    if (input.mapping.length > 0) {
      await tx.insert(importMappings).values(
        input.mapping.map((entry) => ({
          importId: importRow.id,
          sourceColumn: entry.sourceColumn,
          targetField: entry.targetField,
        }))
      );
    }

    if (input.rowsToInsert.length > 0) {
      await tx.insert(transactions).values(
        input.rowsToInsert.map((row) => {
          const amount = row.amount.toFixed(2);
          const rate = rateByCurrency.get(row.currency)!;
          return {
            organizationId,
            date: row.date,
            amount,
            currency: row.currency,
            baseAmount: convertAmount(amount, rate.rate),
            baseCurrency: organizationBaseCurrency,
            exchangeRate: rate.rate,
            exchangeRateSource: rate.source,
            exchangeRateTime: rate.time,
            type: row.type,
            category: row.category,
            description: row.description ?? null,
            referenceId: row.referenceId ?? null,
            source: input.source,
            // Provenance back to this import and the row within it —
            // deliberately not derived from any original CSV/XLSX
            // internals (no original row index, sheet name, etc.), so
            // downstream code still never depends on the source format.
            sourceRecordId: `${importRow.id}:row-${row.rowNumber}`,
          };
        })
      );
    }

    return importRow;
  });
}

export async function listImports(organizationId: string, limit = 20): Promise<ImportRecord[]> {
  return db
    .select()
    .from(imports)
    .where(eq(imports.organizationId, organizationId))
    .orderBy(desc(imports.createdAt))
    .limit(limit);
}

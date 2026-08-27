"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { auditLogSafely } from "@/server/services/audit-log";
import { logServerError } from "@/server/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { parseImportFile, ImportFileError } from "./parse";
import { suggestColumnMapping } from "@/server/engines/column-detection";
import { normalizeRows, validateColumnMapping } from "@/server/engines/normalization";
import { flagExistingDuplicates, commitImport } from "@/server/services/imports";
import { getOrganization } from "@/server/services/organizations";
import { FxRateUnavailableError } from "@/server/services/fx";
import { columnMappingSchema, currencySchema } from "./schema";
import type {
  ColumnMappingEntry,
  DuplicateCandidateRow,
  NormalizedTransactionRow,
  RowIssue,
} from "@/server/engines/import-types";

// Generous enough for a real workflow (upload, tweak the mapping a few
// times, confirm) while still bounding the cost of a synchronous,
// in-memory parse-and-normalize per request — there's no background job
// queue in this MVP, so each call does real work inline.
const IMPORT_RATE_LIMIT = 30;
const IMPORT_RATE_WINDOW_MS = 15 * 60 * 1000;
const SAMPLE_SIZE = 15;

function sourceFromFilename(filename: string): "CSV" | "EXCEL" {
  return filename.toLowerCase().endsWith(".csv") ? "CSV" : "EXCEL";
}

function parseMappingField(raw: FormDataEntryValue | null): ColumnMappingEntry[] | { error: string } {
  if (typeof raw !== "string" || !raw) return { error: "No column mapping was provided." };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "The column mapping could not be read." };
  }

  const result = columnMappingSchema.safeParse(json);
  if (!result.success) return { error: "The column mapping is invalid." };
  return result.data;
}

export interface AnalyzeImportResult {
  error?: string;
  headers?: string[];
  suggestedMapping?: ColumnMappingEntry[];
  mappingErrors?: string[];
  totalRows?: number;
  validCount?: number;
  invalidCount?: number;
  duplicateCount?: number;
  sampleValid?: NormalizedTransactionRow[];
  sampleInvalid?: RowIssue[];
  sampleDuplicates?: DuplicateCandidateRow[];
}

/**
 * Serves the UPLOAD / DETECT COLUMNS / MAP / PREVIEW / VALIDATE steps of
 * the import flow. Called once on initial upload — with no `mapping`
 * field yet, so it returns the file's headers and a suggested mapping
 * for the user to review — and again every time the user adjusts the
 * mapping in the UI, at which point it re-parses the file and returns a
 * fully server-validated preview (counts plus a capped sample of each
 * bucket). The file is re-parsed from scratch on every call rather than
 * read from any server-side staging: see docs/ARCHITECTURE.md's note on
 * why `imports` has no PENDING state — the wizard resends the browser's
 * in-memory File object at each step instead.
 */
export async function analyzeImportAction(formData: FormData): Promise<AnalyzeImportResult> {
  const session = await verifySession();

  const ip = await getClientIp();
  const rateLimit = checkRateLimit(
    `import:${session.organizationId}:${ip}`,
    IMPORT_RATE_LIMIT,
    IMPORT_RATE_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return { error: "Too many import attempts. Try again in a few minutes." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "No file was uploaded." };
  }

  const defaultCurrency = currencySchema.safeParse(formData.get("defaultCurrency"));
  if (!defaultCurrency.success) {
    return { error: "Select a valid default currency." };
  }

  let parsed;
  try {
    parsed = parseImportFile(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (error) {
    if (error instanceof ImportFileError) return { error: error.message };
    logServerError(
      "imports",
      "Import file parse failed",
      { organizationId: session.organizationId, userId: session.userId, filename: file.name },
      error
    );
    return { error: "The file could not be read." };
  }

  const mappingRaw = formData.get("mapping");
  if (typeof mappingRaw !== "string" || !mappingRaw) {
    // First call for this file: no mapping to preview against yet.
    return {
      headers: parsed.headers,
      suggestedMapping: suggestColumnMapping(parsed.headers),
      totalRows: parsed.rows.length,
    };
  }

  const mapping = parseMappingField(mappingRaw);
  if ("error" in mapping) return { error: mapping.error };

  const mappingErrors = validateColumnMapping(mapping);
  if (mappingErrors.length > 0) {
    return { headers: parsed.headers, totalRows: parsed.rows.length, mappingErrors };
  }

  const normalized = normalizeRows(parsed.rows, mapping, {
    defaultCurrency: defaultCurrency.data,
  });
  const { valid: trulyValid, duplicates: existingDuplicates } = await flagExistingDuplicates(
    session.organizationId,
    normalized.valid
  );
  const allDuplicates = [...normalized.duplicates, ...existingDuplicates];

  return {
    headers: parsed.headers,
    totalRows: normalized.totalRows,
    validCount: trulyValid.length,
    invalidCount: normalized.invalid.length,
    duplicateCount: allDuplicates.length,
    sampleValid: trulyValid.slice(0, SAMPLE_SIZE),
    sampleInvalid: normalized.invalid.slice(0, SAMPLE_SIZE),
    sampleDuplicates: allDuplicates.slice(0, SAMPLE_SIZE),
  };
}

export interface CommitImportResult {
  error?: string;
  success?: boolean;
  importId?: string;
  insertedCount?: number;
  validCount?: number;
  invalidCount?: number;
  duplicateCount?: number;
}

/**
 * The USER CONFIRMS -> NORMALIZE -> SAVE steps. Re-parses and
 * re-normalizes the file from scratch, exactly like
 * `analyzeImportAction` — nothing the client computed during preview is
 * trusted as the basis for what gets written; only what's recomputed
 * here, from the re-parsed file, is ever inserted.
 */
export async function commitImportAction(formData: FormData): Promise<CommitImportResult> {
  const session = await verifySession();

  const ip = await getClientIp();
  const rateLimit = checkRateLimit(
    `import-commit:${session.organizationId}:${ip}`,
    IMPORT_RATE_LIMIT,
    IMPORT_RATE_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return { error: "Too many import attempts. Try again in a few minutes." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "No file was uploaded." };
  }

  const defaultCurrency = currencySchema.safeParse(formData.get("defaultCurrency"));
  if (!defaultCurrency.success) {
    return { error: "Select a valid default currency." };
  }

  const mapping = parseMappingField(formData.get("mapping"));
  if ("error" in mapping) return { error: mapping.error };

  const mappingErrors = validateColumnMapping(mapping);
  if (mappingErrors.length > 0) {
    return { error: mappingErrors.join(" ") };
  }

  const includeDuplicates = formData.get("includeDuplicates") === "true";

  let parsed;
  try {
    parsed = parseImportFile(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (error) {
    if (error instanceof ImportFileError) return { error: error.message };
    logServerError(
      "imports",
      "Import file parse failed",
      { organizationId: session.organizationId, userId: session.userId, filename: file.name },
      error
    );
    return { error: "The file could not be read." };
  }

  const normalized = normalizeRows(parsed.rows, mapping, {
    defaultCurrency: defaultCurrency.data,
  });
  const { valid: trulyValid, duplicates: existingDuplicates } = await flagExistingDuplicates(
    session.organizationId,
    normalized.valid
  );
  const allDuplicates = [...normalized.duplicates, ...existingDuplicates];
  const rowsToInsert = includeDuplicates ? [...trulyValid, ...allDuplicates] : trulyValid;

  if (rowsToInsert.length === 0) {
    return {
      error: "Nothing was imported — every row was either invalid or a duplicate.",
      validCount: trulyValid.length,
      invalidCount: normalized.invalid.length,
      duplicateCount: allDuplicates.length,
    };
  }

  const organization = await getOrganization(session.organizationId);
  const baseCurrency = organization?.baseCurrency ?? "GBP";

  let importRow;
  try {
    importRow = await commitImport(session.organizationId, baseCurrency, session.userId, {
      filename: file.name,
      source: sourceFromFilename(file.name),
      mapping,
      rowsToInsert,
      totalRowCount: normalized.totalRows,
      invalidRowCount: normalized.invalid.length,
      validRowCount: trulyValid.length + allDuplicates.length,
      duplicateRowCount: allDuplicates.length,
    });
  } catch (error) {
    if (error instanceof FxRateUnavailableError) {
      // Never silently save a guessed conversion (brief section 25) —
      // nothing was written (commitImport's insert is inside a single DB
      // transaction), so this is safe to just ask the person to retry.
      return {
        error: `Could not convert this batch to ${baseCurrency}: exchange rate for ${error.sourceCurrency} \u2192 ${error.targetCurrency} is unavailable right now. Please try again shortly.`,
      };
    }
    throw error;
  }

  await auditLogSafely({
    action: "IMPORT_COMMITTED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "import",
    entityId: importRow.id,
    metadata: {
      filename: file.name,
      source: importRow.source,
      insertedRowCount: importRow.insertedRowCount,
      invalidRowCount: importRow.invalidRowCount,
      duplicateRowCount: importRow.duplicateRowCount,
    },
  });

  revalidatePath("/imports");
  revalidatePath("/transactions");

  return {
    success: true,
    importId: importRow.id,
    insertedCount: importRow.insertedRowCount,
    validCount: trulyValid.length + allDuplicates.length,
    invalidCount: normalized.invalid.length,
    duplicateCount: allDuplicates.length,
  };
}

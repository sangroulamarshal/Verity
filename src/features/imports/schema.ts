import { z } from "zod";
import { IMPORT_TARGET_FIELDS } from "@/server/engines/import-types";

export const importTargetFieldSchema = z.enum(IMPORT_TARGET_FIELDS);

export const columnMappingEntrySchema = z.object({
  sourceColumn: z.string().trim().min(1).max(255),
  targetField: importTargetFieldSchema,
});

// A file with an unreasonable number of columns is itself a signal
// something is wrong — capped generously above any legitimate
// bank/accounting export, well below anything that would make iterating
// the mapping expensive.
export const columnMappingSchema = z.array(columnMappingEntrySchema).min(1).max(64);

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const importSourceSchema = z.enum(["CSV", "EXCEL"]);

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Enter a 3-letter currency code, e.g. GBP.");

"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { validateColumnMapping } from "@/server/engines/normalization";
import {
  IMPORT_TARGET_FIELDS,
  IMPORT_TARGET_FIELD_LABELS,
  type ColumnMappingEntry,
  type ImportTargetField,
} from "@/server/engines/import-types";
import { analyzeImportAction, commitImportAction, type AnalyzeImportResult } from "./actions";

type Step = "upload" | "map" | "done";

const CURRENCIES = ["GBP", "USD", "EUR", "NPR", "INR", "AUD", "CAD"];

function toMappingEntries(byTarget: Partial<Record<ImportTargetField, string>>): ColumnMappingEntry[] {
  return IMPORT_TARGET_FIELDS.filter((field) => byTarget[field]).map((field) => ({
    sourceColumn: byTarget[field] as string,
    targetField: field,
  }));
}

export function ImportWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState("GBP");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappingByTarget, setMappingByTarget] = useState<Partial<Record<ImportTargetField, string>>>({});
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [preview, setPreview] = useState<AnalyzeImportResult | null>(null);
  const [result, setResult] = useState<{
    insertedCount: number;
    invalidCount: number;
    duplicateCount: number;
  } | null>(null);

  const mapping = useMemo(() => toMappingEntries(mappingByTarget), [mappingByTarget]);
  const localMappingErrors = useMemo(() => validateColumnMapping(mapping), [mapping]);

  function reset() {
    setStep("upload");
    setPending(false);
    setError(null);
    setFile(null);
    setDefaultCurrency("GBP");
    setHeaders([]);
    setMappingByTarget({});
    setIncludeDuplicates(false);
    setPreview(null);
    setResult(null);
  }

  function buildFormData(includeMapping: boolean): FormData | null {
    if (!file) return null;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("defaultCurrency", defaultCurrency);
    if (includeMapping) formData.set("mapping", JSON.stringify(mapping));
    return formData;
  }

  async function handleUpload() {
    const formData = buildFormData(false);
    if (!formData) {
      setError("Choose a file first.");
      return;
    }
    setPending(true);
    setError(null);

    const analyzed = await analyzeImportAction(formData);
    setPending(false);

    if (analyzed.error) {
      setError(analyzed.error);
      return;
    }

    setHeaders(analyzed.headers ?? []);
    const initialMapping: Partial<Record<ImportTargetField, string>> = {};
    for (const entry of analyzed.suggestedMapping ?? []) {
      initialMapping[entry.targetField] = entry.sourceColumn;
    }
    setMappingByTarget(initialMapping);
    setStep("map");
  }

  async function handlePreview() {
    if (localMappingErrors.length > 0) return;
    const formData = buildFormData(true);
    if (!formData) return;

    setPending(true);
    setError(null);
    const analyzed = await analyzeImportAction(formData);
    setPending(false);

    if (analyzed.error) {
      setError(analyzed.error);
      setPreview(null);
      return;
    }
    setPreview(analyzed);
  }

  async function handleConfirm() {
    const formData = buildFormData(true);
    if (!formData || !preview) return;
    formData.set("includeDuplicates", includeDuplicates ? "true" : "false");

    setPending(true);
    setError(null);
    const committed = await commitImportAction(formData);
    setPending(false);

    if (committed.error) {
      setError(committed.error);
      return;
    }

    setResult({
      insertedCount: committed.insertedCount ?? 0,
      invalidCount: committed.invalidCount ?? 0,
      duplicateCount: committed.duplicateCount ?? 0,
    });
    setStep("done");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Import transactions</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import transactions</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV or Excel export from your bank or accounting software."}
            {step === "map" && "Match each field to a column, then preview before anything is saved."}
            {step === "done" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="import-file">File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">CSV or Excel, up to 5 MB.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default-currency">
                Default currency <span className="text-muted-foreground">(used unless the file has its own currency column)</span>
              </Label>
              <Select
                id="default-currency"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </div>

            <Button type="button" disabled={!file || pending} onClick={handleUpload} className="mt-2">
              {pending ? "Reading file…" : "Continue"}
            </Button>
          </div>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              {IMPORT_TARGET_FIELDS.map((field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <Label htmlFor={`map-${field}`}>{IMPORT_TARGET_FIELD_LABELS[field]}</Label>
                  <Select
                    id={`map-${field}`}
                    value={mappingByTarget[field] ?? ""}
                    onChange={(e) =>
                      setMappingByTarget((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                    }
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {localMappingErrors.length > 0 && (
              <ul className="list-inside list-disc text-xs text-destructive">
                {localMappingErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={localMappingErrors.length > 0 || pending}
              onClick={handlePreview}
            >
              {pending ? "Checking…" : "Preview"}
            </Button>

            {preview && preview.totalRows !== undefined && (
              <div className="flex flex-col gap-4 rounded-md border border-border p-4">
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <Stat label="Total" value={preview.totalRows} />
                  <Stat label="Valid" value={preview.validCount ?? 0} />
                  <Stat label="Duplicate" value={preview.duplicateCount ?? 0} />
                  <Stat label="Invalid" value={preview.invalidCount ?? 0} />
                </div>

                {preview.sampleValid && preview.sampleValid.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Preview ({preview.sampleValid.length} of {preview.validCount})
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.sampleValid.map((row) => (
                            <TableRow key={row.rowNumber}>
                              <TableCell>{formatDate(row.date)}</TableCell>
                              <TableCell>{row.category}</TableCell>
                              <TableCell
                                className={`text-right tabular-nums ${row.type === "INCOME" ? "text-income" : "text-expense"}`}
                              >
                                {row.type === "INCOME" ? "+" : "−"}
                                {formatCurrency(row.amount, row.currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {preview.sampleInvalid && preview.sampleInvalid.length > 0 && (
                  <IssueList
                    title={`Invalid rows (${preview.sampleInvalid.length} of ${preview.invalidCount})`}
                    items={preview.sampleInvalid.map((row) => ({
                      rowNumber: row.rowNumber,
                      text: row.reasons.join(" "),
                    }))}
                  />
                )}

                {preview.sampleDuplicates && preview.sampleDuplicates.length > 0 && (
                  <>
                    <IssueList
                      title={`Possible duplicates (${preview.sampleDuplicates.length} of ${preview.duplicateCount})`}
                      items={preview.sampleDuplicates.map((row) => ({
                        rowNumber: row.rowNumber,
                        text: row.reasons.join(" "),
                      }))}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeDuplicates}
                        onChange={(e) => setIncludeDuplicates(e.target.checked)}
                        className="size-4 rounded border-input"
                      />
                      Import these anyway
                    </label>
                  </>
                )}

                <Button
                  type="button"
                  disabled={pending || (preview.validCount ?? 0) + (includeDuplicates ? preview.duplicateCount ?? 0 : 0) === 0}
                  onClick={handleConfirm}
                >
                  {pending ? "Importing…" : "Confirm import"}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <Stat label="Imported" value={result.insertedCount} />
              <Stat label="Duplicate" value={result.duplicateCount} />
              <Stat label="Invalid" value={result.invalidCount} />
            </div>
            <Button type="button" variant="outline" onClick={reset}>
              Import another file
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function IssueList({ title, items }: { title: string; items: { rowNumber: number; text: string }[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="max-h-32 overflow-y-auto rounded-md border border-border px-3 py-2 text-xs">
        {items.map((item) => (
          <li key={item.rowNumber} className="py-0.5">
            <span className="text-muted-foreground">Row {item.rowNumber}:</span> {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

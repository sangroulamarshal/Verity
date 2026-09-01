import type { Metadata } from "next";
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { verifySession } from "@/server/services/session";
import { listImports } from "@/server/services/imports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportWizard } from "@/features/imports/import-wizard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Imports" };

export default async function ImportsPage() {
  const session = await verifySession();
  const history = await listImports(session.organizationId);

  const totalRows = history.reduce((s, r) => s + r.rowCount, 0);
  const totalImported = history.reduce((s, r) => s + r.insertedRowCount, 0);
  const totalWarnings = history.reduce((s, r) => s + r.invalidRowCount, 0);
  const totalFailed = history.reduce((s, r) => s + (r.rowCount - r.insertedRowCount - r.duplicateRowCount - r.invalidRowCount), 0);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Imports</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Import transaction data from financial statements and supported sources.
          </p>
        </div>
        <ImportWizard />
      </div>

      {/* Supported formats */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[12px] text-muted-foreground">Supported:</span>
        {["CSV", "XLS", "XLSX", "eSewa"].map((fmt) => (
          <span key={fmt} className="rounded border border-border bg-elevated px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            {fmt}
          </span>
        ))}
      </div>

      {/* Summary cards */}
      {history.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Imports", value: history.length, icon: Upload, color: "bg-primary/15 text-primary" },
            { label: "Rows Imported", value: totalImported, icon: CheckCircle, color: "bg-income/15 text-income" },
            { label: "Warnings", value: totalWarnings, icon: AlertTriangle, color: "bg-risk-medium/15 text-risk-medium" },
            { label: "Failed Rows", value: totalFailed, icon: XCircle, color: "bg-expense/15 text-expense" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 px-4 py-3.5">
                <div className={cn("flex size-8 items-center justify-center rounded-md", color)}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-[20px] font-semibold tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import history table */}
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-medium">Import History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">File</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Source</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Uploaded</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Rows</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Imported</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Duplicates</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Invalid</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="size-8 text-muted-foreground/30" />
                      <p className="text-[13px] font-medium">No imports yet</p>
                      <p className="text-[12px] text-muted-foreground">Upload a CSV or Excel file to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const hasIssues = row.invalidRowCount > 0;
                  const success = row.insertedRowCount > 0;
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="size-3.5 shrink-0 text-muted-foreground/40" />
                          <span className="max-w-[200px] truncate font-medium">{row.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded border border-border bg-elevated px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                          {row.source}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(row.createdAt.toISOString().slice(0, 10))}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.rowCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-income font-medium">{row.insertedRowCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.duplicateRowCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className={row.invalidRowCount > 0 ? "text-risk-medium font-medium" : "text-muted-foreground"}>
                          {row.invalidRowCount}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {hasIssues ? (
                          <Badge variant="warning">Completed with warnings</Badge>
                        ) : success ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">No rows imported</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

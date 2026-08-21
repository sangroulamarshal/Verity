import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { listImports } from "@/server/services/imports";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { ImportWizard } from "@/features/imports/import-wizard";

export const metadata: Metadata = {
  title: "Imports — Verity",
};

export default async function ImportsPage() {
  const session = await verifySession();
  const history = await listImports(session.organizationId);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Imports</h1>
          <p className="text-sm text-muted-foreground">
            Bring in transactions from a CSV or Excel export.
          </p>
        </div>
        <ImportWizard />
      </div>

      <Card>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No imports yet. Import a CSV or Excel file to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Duplicates</TableHead>
                  <TableHead className="text-right">Invalid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-48 truncate">{row.filename}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>{formatDate(row.createdAt.toISOString().slice(0, 10))}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.rowCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.insertedRowCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.duplicateRowCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.invalidRowCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { RiskLevelBadge } from "./risk-badge";
import type { RiskTransactionRow } from "@/server/services/risk";

const STATUS_LABELS: Record<string, string> = {
  UNREVIEWED: "Needs review",
  REVIEWED: "Reviewed",
  DISMISSED: "Dismissed",
};

export function RiskTable({ rows }: { rows: RiskTransactionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-[13px] font-medium">No flagged transactions</p>
        <p className="text-[13px] text-muted-foreground">
          Nothing matches the current filters, or nothing has been flagged yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="max-w-[280px]">Reason</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer">
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block whitespace-nowrap px-4 py-2 tabular-nums text-muted-foreground">
                  {formatDate(row.date)}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block max-w-[220px] truncate px-4 py-2">
                  {row.description || <span className="text-muted-foreground">{row.category}</span>}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block max-w-[160px] truncate px-4 py-2 text-muted-foreground">
                  {row.counterparty ?? "\u2014"}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block px-4 py-2 text-right tabular-nums font-medium">
                  {formatCurrency(row.amount, row.currency)}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block px-4 py-2 text-right tabular-nums font-medium">
                  {row.riskScore ?? "\u2014"}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block px-4 py-2">
                  {row.riskLevel && <RiskLevelBadge level={row.riskLevel} />}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block max-w-[280px] truncate px-4 py-2 text-muted-foreground">
                  {row.topReason ?? "\u2014"}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link href={`/risk/${row.id}`} className="block px-4 py-2 text-muted-foreground">
                  {row.riskStatus ? STATUS_LABELS[row.riskStatus] : "\u2014"}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

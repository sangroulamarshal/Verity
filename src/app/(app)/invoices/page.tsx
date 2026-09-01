import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText, Clock, CheckCircle, AlertTriangle, FilePenLine,
  MoreHorizontal, Plus
} from "lucide-react";
import { verifySession } from "@/server/services/session";
import { listInvoices, getInvoiceSummary } from "@/server/services/invoices";
import { getOrganization } from "@/server/services/organizations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

const STATUS_COLORS: Record<string, BadgeVariant> = {
  PAID: "success",
  SENT: "default",
  VIEWED: "default",
  PARTIALLY_PAID: "warning",
  OVERDUE: "expense",
  DRAFT: "secondary",
  CANCELLED: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Paid", SENT: "Outstanding", VIEWED: "Viewed",
  PARTIALLY_PAID: "Part Paid", OVERDUE: "Overdue",
  DRAFT: "Draft", CANCELLED: "Cancelled",
};

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function InvoicesPage(props: { searchParams: Promise<Record<string, string>> }) {
  const session = await verifySession();
  const sp = await props.searchParams;
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const status = firstParam(sp.status) as "DRAFT" | "SENT" | "VIEWED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" | undefined;
  const org = await getOrganization(session.organizationId);
  const baseCurrency = org?.baseCurrency ?? "GBP";

  const [summary, { rows, total, totalPages }] = await Promise.all([
    getInvoiceSummary(session.organizationId, baseCurrency),
    listInvoices(session.organizationId, { page, status }),
  ]);

  // Quick counts for the donut/bar section
  const [draftRows] = await Promise.all([
    listInvoices(session.organizationId, { status: "DRAFT", pageSize: 1 }),
  ]);

  const tabs = [
    { label: "Overview", href: "/invoices" },
    { label: "All Invoices", href: "/invoices?filter=all" },
    { label: "Drafts", href: "/invoices?status=DRAFT" },
    { label: "Outstanding", href: "/invoices?status=SENT" },
    { label: "Paid", href: "/invoices?status=PAID" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Invoices</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Track billing activity and monitor payment status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export</Button>
          <Button size="sm"><Plus className="mr-1 size-3.5" /> Create Invoice</Button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total Invoiced", value: formatCurrency(summary.totalOutstanding + 0, baseCurrency), icon: FileText, color: "bg-primary/15 text-primary" },
          { label: "Paid", value: formatCurrency(0, baseCurrency), icon: CheckCircle, color: "bg-income/15 text-income" },
          { label: "Outstanding", value: formatCurrency(summary.totalOutstanding, baseCurrency), icon: Clock, color: "bg-primary/15 text-primary" },
          { label: "Overdue", value: formatCurrency(summary.totalOverdue, baseCurrency), icon: AlertTriangle, color: "bg-expense/15 text-expense" },
          { label: "Drafts", value: String(draftRows.total), icon: FilePenLine, color: "bg-muted text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="px-5 py-4">
              <div className="flex items-start justify-between">
                <p className="text-[12px] text-muted-foreground">{label}</p>
                <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", color)}>
                  <Icon className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-[20px] font-semibold tabular-nums tracking-tight">{value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">0% from last 30 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="mt-4 rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="flex border-b border-border px-4 pt-1">
          {tabs.map((tab) => {
            const isActive = tab.href === "/invoices" && !status && !sp.filter;
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={cn(
                  "relative pb-2.5 pt-2 px-3 text-[13px] font-medium transition-colors",
                  isActive
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Invoice table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Invoice #</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Customer</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Issue Date</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Due Date</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Status</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Amount</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Paid</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Balance</th>
                <th className="w-16 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="size-8 text-muted-foreground/30" />
                      <p className="text-[13px] font-medium">No invoices yet</p>
                      <p className="text-[12px] text-muted-foreground">Create your first invoice to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((inv) => {
                  const balance = Number(inv.baseTotalAmount) - Number(inv.basePaidAmount);
                  const isOverdue = inv.status === "OVERDUE";
                  return (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-[12px] text-primary">
                          {inv.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[160px]">
                        <span className="truncate block font-medium">{inv.clientName ?? "--"}</span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className={cn("px-4 py-2.5 tabular-nums whitespace-nowrap", isOverdue ? "text-expense font-medium" : "text-muted-foreground")}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_COLORS[inv.status] ?? "secondary"}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {formatCurrency(inv.baseTotalAmount, inv.baseCurrency)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-income">
                        {Number(inv.basePaidAmount) > 0 ? formatCurrency(inv.basePaidAmount, inv.baseCurrency) : (
                          <span className="text-muted-foreground/40">--</span>
                        )}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums", balance > 0 ? "font-medium" : "text-muted-foreground")}>
                        {balance > 0 ? formatCurrency(String(balance), inv.baseCurrency) : "--"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground">
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground">
                            <MoreHorizontal className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
          <span className="text-[12px] text-muted-foreground">
            Showing 1 to {rows.length} of {total} invoices
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].filter(p => p <= totalPages).map((p) => (
                <Button key={p} asChild={p !== page} variant={p === page ? "default" : "ghost"} size="sm">
                  {p === page ? <span>{String(p)}</span> : <Link href={`/invoices?page=${p}${status ? `&status=${status}` : ""}`}>{p}</Link>}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

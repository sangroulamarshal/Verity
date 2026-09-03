import type { Metadata } from "next";
import Link from "next/link";
import { MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { verifySession } from "@/server/services/session";
import { listCustomers } from "@/server/services/customers";
import { canWriteCustomers } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CustomerDialog } from "@/features/customers/customer-dialog";
import { CustomerSearch } from "@/features/customers/customer-search";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/server/engines/risk-engine";

export const metadata: Metadata = { title: "Customers" };

const RISK_LEVELS: { value: RiskLevel | ""; label: string }[] = [
  { value: "",         label: "All risk levels" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH",     label: "High" },
  { value: "MEDIUM",   label: "Medium" },
  { value: "LOW",      label: "Low" },
];

const RISK_BADGE_VARIANT: Record<RiskLevel, "risk-critical" | "risk-high" | "risk-medium" | "risk-low"> = {
  CRITICAL: "risk-critical",
  HIGH:     "risk-high",
  MEDIUM:   "risk-medium",
  LOW:      "risk-low",
};

const RISK_BADGE_LABEL: Record<RiskLevel, string> = {
  CRITICAL: "Critical",
  HIGH:     "High",
  MEDIUM:   "Medium",
  LOW:      "Low",
};

function firstParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CustomersPage(props: PageProps<"/customers">) {
  const session = await verifySession();
  const sp = await props.searchParams;
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const search = firstParam(sp.search);
  const sortBy = (firstParam(sp.sortBy) ?? "name") as "name" | "updatedAt";
  const sortDir = (firstParam(sp.sortDir) ?? "asc") as "asc" | "desc";
  const riskParam = firstParam(sp.risk) as RiskLevel | "" | undefined;
  const riskLevel = (riskParam && ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(riskParam))
    ? riskParam as RiskLevel
    : undefined;
  const canEdit = canWriteCustomers(session.role);

  const { rows, total, totalPages } = await listCustomers(session.organizationId, {
    page, search, sortBy, sortDir, riskLevel,
  });

  const filterHref = (level: RiskLevel | "") => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sortBy !== "name") params.set("sortBy", sortBy);
    if (sortDir !== "asc") params.set("sortDir", sortDir);
    if (level) params.set("risk", level);
    const qs = params.toString();
    return `/customers${qs ? `?${qs}` : ""}`;
  };

  const sortHref = (col: "name" | "updatedAt") => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (riskLevel) params.set("risk", riskLevel);
    params.set("sortBy", col);
    params.set("sortDir", sortBy === col && sortDir === "asc" ? "desc" : "asc");
    return `/customers?${params}`;
  };

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (search) params.set("search", search);
    if (riskLevel) params.set("risk", riskLevel);
    if (sortBy !== "name") params.set("sortBy", sortBy);
    if (sortDir !== "asc") params.set("sortDir", sortDir);
    return `/customers?${params}`;
  };

  function SortIcon({ col }: { col: "name" | "updatedAt" }) {
    if (sortBy !== col) return null;
    return sortDir === "asc"
      ? <ChevronUp className="inline size-3 ml-0.5 opacity-60" />
      : <ChevronDown className="inline size-3 ml-0.5 opacity-60" />;
  }

  const activeRiskLabel = RISK_LEVELS.find((r) => r.value === (riskLevel ?? ""))?.label ?? "All risk levels";

  return (
    <div className="w-full px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Customers</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Manage your customers and track their financial activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export</Button>
          {canEdit && (
            <CustomerDialog
              mode="create"
              trigger={<Button size="sm">+ Add Customer</Button>}
            />
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-64">
          <CustomerSearch />
        </div>
        {/* Risk level filter — server-side via URL param */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface">
          {RISK_LEVELS.map(({ value, label }) => (
            <Link
              key={value}
              href={filterHref(value)}
              className={cn(
                "px-3 py-1.5 text-[12px] transition-colors rounded-md",
                (riskLevel ?? "") === value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-elevated"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/30">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <Link href={sortHref("name")} className="hover:text-foreground transition-colors">
                    Customer <SortIcon col="name" />
                  </Link>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contact</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Transactions</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Risk</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <Link href={sortHref("updatedAt")} className="hover:text-foreground transition-colors">
                    Last Activity <SortIcon col="updatedAt" />
                  </Link>
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-[13px] text-muted-foreground">
                    {riskLevel
                      ? `No customers with ${RISK_BADGE_LABEL[riskLevel]} risk.`
                      : search
                      ? "No customers match that search."
                      : "No customers yet. Add your first customer to get started."}
                  </td>
                </tr>
              ) : (
                rows.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={customer.name} size="sm" />
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="truncate text-[13px] font-medium hover:text-primary transition-colors block"
                          >
                            {customer.name}
                          </Link>
                          {customer.notes && (
                            <p className="text-[11px] text-muted-foreground/60 truncate max-w-[180px]">
                              {customer.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] text-muted-foreground">
                        {customer.email && <p className="truncate max-w-[180px]">{customer.email}</p>}
                        {customer.phone && <p>{customer.phone}</p>}
                        {!customer.email && !customer.phone && <span className="text-muted-foreground/40">--</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">--</td>
                    <td className="px-4 py-3">
                      {customer.topRiskLevel ? (
                        <Link href={filterHref(customer.topRiskLevel)}>
                          <Badge variant={RISK_BADGE_VARIANT[customer.topRiskLevel]}>
                            {RISK_BADGE_LABEL[customer.topRiskLevel]}
                          </Badge>
                        </Link>
                      ) : (
                        <span className="text-[12px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {customer.updatedAt
                        ? formatDate(new Date(customer.updatedAt).toISOString().slice(0, 10))
                        : "--"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
          <span className="text-[12px] text-muted-foreground">
            Showing {rows.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, total)} of {total} customers
            {riskLevel && <span className="ml-1 text-muted-foreground/60">· filtered by {activeRiskLabel}</span>}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={pageHref(page - 1)}>&larr;</Link>
                </Button>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button key={p} asChild={p !== page} variant={p === page ? "default" : "ghost"} size="sm">
                    {p === page ? <span>{p}</span> : <Link href={pageHref(p)}>{p}</Link>}
                  </Button>
                );
              })}
              {page < totalPages && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={pageHref(page + 1)}>&rarr;</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

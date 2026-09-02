import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/server/services/session";
import { listTransactions } from "@/server/services/transactions";
import { listCustomers } from "@/server/services/customers";
import { formatCurrency } from "@/lib/format";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [txResult, custResult] = await Promise.all([
      listTransactions(session.organizationId, { search: q, page: 1 }),
      listCustomers(session.organizationId, { search: q, page: 1 }),
    ]);

    const results = [
      ...txResult.rows.slice(0, 5).map((t) => ({
        type: "transaction" as const,
        id: t.id,
        label: t.description || t.category || "Transaction",
        sublabel: `${t.type === "INCOME" ? "+" : "-"}${formatCurrency(t.amount, t.currency)} · ${t.date}`,
        href: `/transactions?transactionId=${t.id}`,
      })),
      ...custResult.rows.slice(0, 5).map((c) => ({
        type: "customer" as const,
        id: c.id,
        label: c.name,
        sublabel: c.email ?? c.phone ?? "Customer",
        href: `/customers/${c.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}

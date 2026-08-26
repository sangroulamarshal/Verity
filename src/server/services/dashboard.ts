import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";

export interface MonthlyTotal {
  /** "YYYY-MM" */
  month: string;
  income: number;
  expense: number;
}

export interface DashboardSummary {
  /** All-time totals, across every currency the org has recorded. */
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
  /** Most recent full or in-progress months, oldest first, for the chart. */
  monthlyTotals: MonthlyTotal[];
  /** Most recent transactions, for the dashboard's activity list. */
  recentTransactions: (typeof transactions.$inferSelect)[];
}

const MONTHS_OF_HISTORY = 6;

/**
 * Real, org-scoped aggregates — no placeholder numbers. If an
 * organization has no transactions yet, every total is legitimately zero
 * and the dashboard's empty state communicates that directly rather than
 * inventing sample figures.
 *
 * Sums `baseAmount` (the organization-base-currency snapshot), never
 * `amount` (the original per-transaction currency) — summing `amount`
 * across transactions recorded in different currencies would silently
 * add USD figures to NPR figures as if they were the same unit (brief
 * section 30 is explicit that this must never happen). `baseAmount` is
 * already expressed in one common currency for every row, so a plain SQL
 * sum is correct here without any conversion at query time.
 */
export async function getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
  const [totalsRow] = await db
    .select({
      totalIncome: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      totalExpense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
      transactionCount: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId));

  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
      income: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      expense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM') desc`)
    .limit(MONTHS_OF_HISTORY);

  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(5);

  const totalIncome = Number(totalsRow?.totalIncome ?? 0);
  const totalExpense = Number(totalsRow?.totalExpense ?? 0);

  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: Number(totalsRow?.transactionCount ?? 0),
    monthlyTotals: monthlyRows
      .map((row) => ({
        month: row.month,
        income: Number(row.income),
        expense: Number(row.expense),
      }))
      .reverse(),
    recentTransactions,
  };
}

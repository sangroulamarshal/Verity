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
  /** Currency of the most recent transaction, used to label the summary
   *  cards. Single-currency orgs (the common case) get a clean "NPR 1,240,500"
   *  style figure; mixed-currency orgs still get a correct sum, just
   *  without a single currency symbol attached (see dashboard page). */
  primaryCurrency: string | null;
}

const MONTHS_OF_HISTORY = 6;

/**
 * Real, org-scoped aggregates — no placeholder numbers. If an
 * organization has no transactions yet, every total is legitimately zero
 * and the dashboard's empty state communicates that directly rather than
 * inventing sample figures.
 */
export async function getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
  const [totalsRow] = await db
    .select({
      totalIncome: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      totalExpense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
      transactionCount: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(eq(transactions.organizationId, organizationId));

  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
      income: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      expense: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
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
    primaryCurrency: recentTransactions[0]?.currency ?? null,
  };
}

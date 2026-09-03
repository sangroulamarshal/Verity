import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { customers, transactions } from "@/db/schema";
import type { RiskLevel } from "@/server/engines/risk-engine";

export type Customer = typeof customers.$inferSelect;

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ListCustomersOptions {
  page?: number;
  pageSize?: number;
  /** Matches name, email, or phone. */
  search?: string;
  sortBy?: "name" | "updatedAt";
  sortDir?: "asc" | "desc";
  /** Filter by the customer's highest transaction risk level. */
  riskLevel?: RiskLevel;
}

export interface CustomerRow extends Customer {
  /** Highest risk level across all of this customer's evaluated transactions.
   *  Null when no transactions have been risk-scored yet. */
  topRiskLevel: RiskLevel | null;
}

export interface ListCustomersResult {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Every function below takes `organizationId` as an explicit parameter and
 * bakes it into every query's WHERE clause, including UPDATE/DELETE — same
 * pattern as server/services/transactions.ts and every other org-owned
 * table. See docs/ARCHITECTURE.md.
 */

// Risk level ordering — used to find the highest level per customer.
// Postgres CASE expression mirrors the LEVEL_ORDER array in risk-engine.ts.
const RISK_LEVEL_ORDER = sql<number>`
  case ${transactions.riskLevel}
    when 'CRITICAL' then 4
    when 'HIGH'     then 3
    when 'MEDIUM'   then 2
    when 'LOW'      then 1
    else 0
  end`;

export async function listCustomers(
  organizationId: string,
  options: ListCustomersOptions = {}
): Promise<ListCustomersResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(customers.organizationId, organizationId)];

  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(ilike(customers.name, term), ilike(customers.email, term), ilike(customers.phone, term))!
    );
  }

  // Subquery: highest risk level for each customer, from their evaluated transactions.
  // Uses the same org-scoping pattern as every other query here — organizationId
  // on transactions is checked even though customerId already implies it, because
  // relying on a single FK condition alone is weaker than explicit org scoping
  // (see ARCHITECTURE.md).
  const riskSubq = db
    .select({
      customerId: transactions.customerId,
      topRiskLevel: sql<RiskLevel | null>`
        case max(${RISK_LEVEL_ORDER})
          when 4 then 'CRITICAL'
          when 3 then 'HIGH'
          when 2 then 'MEDIUM'
          when 1 then 'LOW'
          else null
        end`.as("top_risk_level"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        sql`${transactions.customerId} is not null`,
        sql`${transactions.riskLevel} is not null`
      )
    )
    .groupBy(transactions.customerId)
    .as("risk_summary");

  // When a riskLevel filter is set, restrict customers whose topRiskLevel
  // matches. This is done via a HAVING-equivalent — the subquery already
  // groups by customerId, so we filter the join result in the outer WHERE.
  const riskFilterCondition = options.riskLevel
    ? sql`${riskSubq.topRiskLevel} = ${options.riskLevel}`
    : undefined;

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        notes: customers.notes,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        topRiskLevel: riskSubq.topRiskLevel,
      })
      .from(customers)
      .leftJoin(riskSubq, eq(customers.id, riskSubq.customerId))
      .where(riskFilterCondition ? and(where, riskFilterCondition) : where)
      .orderBy(
        options.sortBy === "updatedAt"
          ? options.sortDir === "desc" ? desc(customers.updatedAt) : asc(customers.updatedAt)
          : options.sortDir === "desc" ? desc(customers.name) : asc(customers.name)
      )
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: sql<number>`count(*)` })
      .from(customers)
      .leftJoin(riskSubq, eq(customers.id, riskSubq.customerId))
      .where(riskFilterCondition ? and(where, riskFilterCondition) : where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  return {
    rows: rows as CustomerRow[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCustomerById(
  organizationId: string,
  id: string
): Promise<Customer | null> {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

export async function createCustomer(
  organizationId: string,
  input: CustomerInput
): Promise<Customer> {
  const [row] = await db
    .insert(customers)
    .values({
      organizationId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return row;
}

/**
 * Same null-if-mismatch contract as updateTransaction: doesn't
 * distinguish "doesn't exist" from "belongs to another organization."
 */
export async function updateCustomer(
  organizationId: string,
  id: string,
  input: CustomerInput
): Promise<Customer | null> {
  const [row] = await db
    .update(customers)
    .set({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
    .returning();

  return row ?? null;
}

/**
 * Does NOT touch that customer's transaction history — transactions.customerId
 * has ON DELETE SET NULL (see db/schema/customers.ts), so this only ever
 * unlinks, never deletes or blocks deleting, past transactions.
 */
export async function deleteCustomer(
  organizationId: string,
  id: string
): Promise<Customer | null> {
  const [row] = await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
    .returning();

  return row ?? null;
}

export interface CustomerPickerResult {
  id: string;
  name: string;
}

/**
 * Backs the transaction form's customer picker (features/transactions/
 * customer-picker.tsx) — deliberately separate from listCustomers: no
 * pagination metadata, no email/phone, capped small, and returns nothing
 * for an empty/whitespace query rather than "the first N customers"
 * (there's no useful default order to show before someone's typed
 * anything, and it keeps the picker from firing a real query on every
 * keystroke-cleared-to-empty).
 */
export async function searchCustomersForPicker(
  organizationId: string,
  query: string
): Promise<CustomerPickerResult[]> {
  const term = query.trim();
  if (!term) return [];

  return db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(and(eq(customers.organizationId, organizationId), ilike(customers.name, `%${term}%`)))
    .orderBy(customers.name)
    .limit(8);
}

export interface CustomerSummary {
  /** In the organization's base currency — see the matching comment on
   * server/services/dashboard.ts's getDashboardSummary for why baseAmount
   * (not each transaction's own possibly-different currency) is what
   * gets summed: every transaction already carries one consistent
   * base-currency snapshot, so this needs no per-row FX lookup. */
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
  lastTransactionDate: string | null;
}

export async function getCustomerSummary(
  organizationId: string,
  customerId: string
): Promise<CustomerSummary> {
  const [row] = await db
    .select({
      totalIncome: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'INCOME'), 0)`,
      totalExpense: sql<string>`coalesce(sum(${transactions.baseAmount}) filter (where ${transactions.type} = 'EXPENSE'), 0)`,
      transactionCount: sql<string>`count(*)`,
      lastTransactionDate: sql<string | null>`max(${transactions.date})`,
    })
    .from(transactions)
    // Both conditions, not customerId alone — same defensive-in-depth
    // reasoning as every other query here: a single FK match is never
    // trusted by itself, organizationId is always checked too.
    .where(and(eq(transactions.organizationId, organizationId), eq(transactions.customerId, customerId)));

  const totalIncome = Number(row?.totalIncome ?? 0);
  const totalExpense = Number(row?.totalExpense ?? 0);

  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: Number(row?.transactionCount ?? 0),
    lastTransactionDate: row?.lastTransactionDate ?? null,
  };
}

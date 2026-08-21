import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";

export type Transaction = typeof transactions.$inferSelect;

export interface ManualTransactionInput {
  date: string;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description?: string;
  referenceId?: string;
}

export interface ListTransactionsOptions {
  page?: number;
  pageSize?: number;
}

export interface ListTransactionsResult {
  rows: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Every function below takes `organizationId` as an explicit parameter —
 * sourced by the caller from the authenticated session, never from a route
 * param or request body — and bakes it directly into the query's WHERE
 * clause for every read *and* write. This is deliberately not a
 * fetch-then-check pattern: there is no window where a row from another
 * organization is ever loaded into memory, so there's nothing to forget to
 * check. A mismatched id and organizationId simply matches zero rows.
 */

export async function createTransaction(
  organizationId: string,
  input: ManualTransactionInput
): Promise<Transaction> {
  const [row] = await db
    .insert(transactions)
    .values({
      organizationId,
      date: input.date,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      type: input.type,
      category: input.category,
      description: input.description ?? null,
      referenceId: input.referenceId ?? null,
      source: "MANUAL",
    })
    .returning();

  return row;
}

export async function listTransactions(
  organizationId: string,
  options: ListTransactionsOptions = {}
): Promise<ListTransactionsResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(eq(transactions.organizationId, organizationId))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.organizationId, organizationId)),
  ]);

  const total = totalRows[0]?.value ?? 0;

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTransactionById(
  organizationId: string,
  id: string
): Promise<Transaction | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

/**
 * Takes the full record rather than a partial patch — the edit form always
 * re-submits every field, including clearing an optional field back to
 * empty, so there's no ambiguity between "field omitted" and "field
 * cleared" for this to get wrong.
 *
 * Returns `null` both when the id doesn't exist at all AND when it belongs
 * to a different organization — deliberately indistinguishable from the
 * caller's side, same rationale as auth's generic "Invalid email or
 * password": confirming "that record exists, just not for you" is itself
 * a (smaller) information leak.
 */
export async function updateTransaction(
  organizationId: string,
  id: string,
  input: ManualTransactionInput
): Promise<Transaction | null> {
  const [row] = await db
    .update(transactions)
    .set({
      date: input.date,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      type: input.type,
      category: input.category,
      description: input.description ?? null,
      referenceId: input.referenceId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, organizationId)))
    .returning();

  return row ?? null;
}

export async function deleteTransaction(
  organizationId: string,
  id: string
): Promise<Transaction | null> {
  const [row] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, organizationId)))
    .returning();

  return row ?? null;
}

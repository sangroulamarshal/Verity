import "server-only";
import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { convertToTargetCurrency } from "./fx";

export type Transaction = typeof transactions.$inferSelect;

export interface ManualTransactionInput {
  date: string;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description?: string;
  referenceId?: string;
  counterparty?: string;
  paymentMethod?: string;
  presetId?: string;
}

export interface ListTransactionsOptions {
  page?: number;
  pageSize?: number;
  /** Matches description, category, counterparty, reference, or currency. */
  search?: string;
  type?: "INCOME" | "EXPENSE";
  category?: string;
  currency?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
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

/**
 * Resolves and stores the organization-base-currency snapshot for a new
 * transaction. Throws FxRateUnavailableError (from server/services/fx)
 * if a real conversion is needed and the rate can't be obtained — the
 * caller (features/transactions/actions.ts) is expected to surface that
 * as a form error rather than saving a guessed value. See brief section 25.
 */
async function resolveBaseCurrencyFields(originalAmount: string, originalCurrency: string, organizationBaseCurrency: string) {
  const converted = await convertToTargetCurrency(
    originalAmount,
    originalCurrency,
    organizationBaseCurrency
  );

  return {
    baseAmount: converted.convertedAmount,
    baseCurrency: converted.targetCurrency,
    exchangeRate: converted.rate.rate,
    exchangeRateSource: converted.rate.source,
    exchangeRateTime: converted.rate.time,
  };
}

export async function createTransaction(
  organizationId: string,
  organizationBaseCurrency: string,
  input: ManualTransactionInput
): Promise<Transaction> {
  const originalAmount = input.amount.toFixed(2);
  const baseFields = await resolveBaseCurrencyFields(
    originalAmount,
    input.currency,
    organizationBaseCurrency
  );

  const [row] = await db
    .insert(transactions)
    .values({
      organizationId,
      date: input.date,
      amount: originalAmount,
      currency: input.currency,
      ...baseFields,
      type: input.type,
      category: input.category,
      counterparty: input.counterparty ?? null,
      paymentMethod: input.paymentMethod ?? null,
      description: input.description ?? null,
      referenceId: input.referenceId ?? null,
      presetId: input.presetId ?? null,
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

  const conditions = [eq(transactions.organizationId, organizationId)];

  if (options.type) conditions.push(eq(transactions.type, options.type));
  if (options.category) conditions.push(eq(transactions.category, options.category));
  if (options.currency) conditions.push(eq(transactions.currency, options.currency));
  if (options.paymentMethod) conditions.push(eq(transactions.paymentMethod, options.paymentMethod));
  if (options.dateFrom) conditions.push(gte(transactions.date, options.dateFrom));
  if (options.dateTo) conditions.push(lte(transactions.date, options.dateTo));

  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(transactions.description, term),
        ilike(transactions.category, term),
        ilike(transactions.counterparty, term),
        ilike(transactions.referenceId, term),
        ilike(transactions.currency, term)
      )!
    );
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(transactions).where(where),
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
  organizationBaseCurrency: string,
  id: string,
  input: ManualTransactionInput
): Promise<Transaction | null> {
  const originalAmount = input.amount.toFixed(2);
  // A correction to amount/currency re-derives a fresh base-currency
  // snapshot (new rate, new exchangeRateTime) — it does not try to
  // preserve the old rate against a new amount, which brief section 22
  // ("don't recalculate historical values using today's rate") is about
  // *later* rate movements, not about a genuine edit to what was
  // recorded. This is a new fact being entered, not history being
  // rewritten.
  const baseFields = await resolveBaseCurrencyFields(
    originalAmount,
    input.currency,
    organizationBaseCurrency
  );

  const [row] = await db
    .update(transactions)
    .set({
      date: input.date,
      amount: originalAmount,
      currency: input.currency,
      ...baseFields,
      type: input.type,
      category: input.category,
      counterparty: input.counterparty ?? null,
      paymentMethod: input.paymentMethod ?? null,
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

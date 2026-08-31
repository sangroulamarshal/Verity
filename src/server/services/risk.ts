import "server-only";
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions, riskEvents, customers } from "@/db/schema";
import {
  evaluateTransactionRisk,
  type AmountReference,
  type RiskEvaluationInput,
  type RiskEvaluationResult,
  type RiskLevel,
  type RiskSignal,
} from "@/server/engines/risk-engine";
import { logServerError } from "@/server/log";

export type { RiskEvaluationResult, RiskLevel, RiskSignal } from "@/server/engines/risk-engine";
export type RiskStatus = "UNREVIEWED" | "REVIEWED" | "DISMISSED";

type TransactionRow = typeof transactions.$inferSelect;

const FREQUENCY_WINDOW_MINUTES = 60;
const FREQUENCY_HISTORY_DAYS = 30;
const CATEGORY_TREND_MONTHS = 3;
const DUPLICATE_WINDOW_DAYS = 1;
// Amounts are stored as `numeric` strings (schema/transactions.ts) —
// compared with a small tolerance rather than exact equality so e.g.
// "150.00" vs "150.0" are still recognized as the same amount.
const DUPLICATE_AMOUNT_TOLERANCE = "0.01";
const NEW_CUSTOMER_DAYS = 14;
const NEW_CUSTOMER_MIN_TRANSACTIONS = 2;

/**
 * Every reference stat below is computed from `baseAmount` — the
 * organization-base-currency snapshot every transaction already carries
 * (server/services/fx.ts) — never the original per-transaction `amount`.
 * This is what makes comparing a NPR customer's history against a USD
 * transaction safe: baseAmount already expresses every row in one common
 * currency, so a plain average/sum is correct without converting
 * anything at query time. Brief's multi-currency requirement is
 * satisfied by reusing this existing column, not by adding new
 * conversion logic.
 */
async function amountReference(conditions: ReturnType<typeof and>): Promise<AmountReference> {
  const [row] = await db
    .select({
      mean: sql<string>`coalesce(avg(${transactions.baseAmount}), 0)`,
      sampleSize: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(conditions);
  return { mean: Number(row?.mean ?? 0), sampleSize: Number(row?.sampleSize ?? 0) };
}

async function frequencyContext(organizationId: string, customerId: string | null, createdAt: Date) {
  // Scoped to the customer when there is one (a burst of activity from
  // one counterparty), otherwise to the whole organization. Either way,
  // always additionally scoped to organizationId — see the module
  // comment on organization isolation below.
  const scopeCondition = customerId
    ? eq(transactions.customerId, customerId)
    : eq(transactions.organizationId, organizationId);

  const windowStart = new Date(createdAt.getTime() - FREQUENCY_WINDOW_MINUTES * 60_000);
  const historyStart = new Date(createdAt.getTime() - FREQUENCY_HISTORY_DAYS * 24 * 60 * 60_000);

  const [[windowRow], [historyRow]] = await Promise.all([
    db
      .select({ count: sql<string>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          scopeCondition,
          gte(transactions.createdAt, windowStart),
          lte(transactions.createdAt, createdAt)
        )
      ),
    db
      .select({ count: sql<string>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          scopeCondition,
          gte(transactions.createdAt, historyStart),
          lte(transactions.createdAt, windowStart)
        )
      ),
  ]);

  const windowCount = Number(windowRow?.count ?? 0);
  const priorCount = Number(historyRow?.count ?? 0);
  const priorDays = FREQUENCY_HISTORY_DAYS - FREQUENCY_WINDOW_MINUTES / (60 * 24);
  const dailyAverage = priorDays > 0 ? priorCount / priorDays : 0;
  const expectedWindowCount = dailyAverage * (FREQUENCY_WINDOW_MINUTES / (24 * 60));

  return { windowCount, expectedWindowCount };
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function duplicateMatchCount(
  organizationId: string,
  transactionId: string,
  row: TransactionRow
): Promise<number> {
  // Nothing to match a duplicate on if this transaction has neither a
  // customer link nor a reference id — a bare amount+date match alone
  // is too weak a signal on its own (e.g. two unrelated ~£50 expenses
  // recorded the same week are extremely common and not anomalous).
  const identityMatch = row.referenceId
    ? row.customerId
      ? or(eq(transactions.referenceId, row.referenceId), eq(transactions.customerId, row.customerId))
      : eq(transactions.referenceId, row.referenceId)
    : row.customerId
      ? eq(transactions.customerId, row.customerId)
      : null;
  if (!identityMatch) return 0;

  const [result] = await db
    .select({ count: sql<string>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        ne(transactions.id, transactionId),
        eq(transactions.currency, row.currency),
        gte(transactions.date, addDaysToIsoDate(row.date, -DUPLICATE_WINDOW_DAYS)),
        lte(transactions.date, addDaysToIsoDate(row.date, DUPLICATE_WINDOW_DAYS)),
        sql`abs(${transactions.amount}::numeric - ${row.amount}::numeric) <= ${DUPLICATE_AMOUNT_TOLERANCE}`,
        identityMatch
      )
    );
  return Number(result?.count ?? 0);
}

async function categoryTrendContext(
  organizationId: string,
  type: "INCOME" | "EXPENSE",
  category: string,
  currentDateIso: string
) {
  const currentMonth = currentDateIso.slice(0, 7); // "YYYY-MM"
  const [y, m] = currentMonth.split("-").map(Number);
  const cutoff = new Date(Date.UTC(y, m - 1 - CATEGORY_TREND_MONTHS, 1)).toISOString().slice(0, 10);

  const [[currentRow], priorRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.baseAmount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, type),
          eq(transactions.category, category),
          sql`to_char(${transactions.date}::date, 'YYYY-MM') = ${currentMonth}`
        )
      ),
    db
      .select({
        month: sql<string>`to_char(${transactions.date}::date, 'YYYY-MM')`,
        total: sql<string>`sum(${transactions.baseAmount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, type),
          eq(transactions.category, category),
          gte(transactions.date, cutoff),
          sql`to_char(${transactions.date}::date, 'YYYY-MM') <> ${currentMonth}`
        )
      )
      .groupBy(sql`to_char(${transactions.date}::date, 'YYYY-MM')`),
  ]);

  const priorTotals = priorRows.map((r) => Number(r.total));
  const periodsOfHistory = priorTotals.length;
  const averagePriorPeriodTotal =
    periodsOfHistory > 0 ? priorTotals.reduce((a, b) => a + b, 0) / periodsOfHistory : 0;

  return {
    currentPeriodTotal: Number(currentRow?.total ?? 0),
    averagePriorPeriodTotal,
    periodsOfHistory,
  };
}

async function isNewOrInactiveCustomer(organizationId: string, customerId: string): Promise<boolean> {
  const [[customerRow], [countRow]] = await Promise.all([
    db
      .select({ createdAt: customers.createdAt })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .limit(1),
    db
      .select({ count: sql<string>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.organizationId, organizationId), eq(transactions.customerId, customerId))),
  ]);
  if (!customerRow) return false;

  const isRecent = Date.now() - customerRow.createdAt.getTime() < NEW_CUSTOMER_DAYS * 24 * 60 * 60_000;
  const hasFewTransactions = Number(countRow?.count ?? 0) < NEW_CUSTOMER_MIN_TRANSACTIONS;
  return isRecent || hasFewTransactions;
}

/**
 * Evaluates one transaction's risk and persists the result — both the
 * append-only history row (risk_events) and the denormalized "current
 * state" columns on the transaction itself, in the same DB transaction
 * so they can never disagree. Returns null only when the transaction id
 * doesn't exist (or doesn't belong to this organization — deliberately
 * indistinguishable, same as getTransactionById elsewhere).
 *
 * Every query in here is explicitly scoped by organizationId — a
 * transaction's risk is never computed against another organization's
 * historical data (brief's permissions/isolation requirement).
 */
export async function evaluateAndStoreRisk(
  organizationId: string,
  transactionId: string
): Promise<RiskEvaluationResult | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.organizationId, organizationId)))
    .limit(1);
  if (!row) return null;

  const [organizationRef, categoryRef, customerRef, frequency, duplicates, categoryTrend, newCustomer] =
    await Promise.all([
      amountReference(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, row.type),
          ne(transactions.id, transactionId)
        )
      ),
      amountReference(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, row.type),
          eq(transactions.category, row.category),
          ne(transactions.id, transactionId)
        )
      ),
      row.customerId
        ? amountReference(
            and(
              eq(transactions.organizationId, organizationId),
              eq(transactions.type, row.type),
              eq(transactions.customerId, row.customerId),
              ne(transactions.id, transactionId)
            )
          )
        : Promise.resolve(null),
      frequencyContext(organizationId, row.customerId, row.createdAt),
      duplicateMatchCount(organizationId, transactionId, row),
      categoryTrendContext(organizationId, row.type, row.category, row.date),
      row.customerId ? isNewOrInactiveCustomer(organizationId, row.customerId) : Promise.resolve(false),
    ]);

  const input: RiskEvaluationInput = {
    baseAmount: Number(row.baseAmount),
    source: row.source,
    hasCustomer: row.customerId !== null,
    isNewOrInactiveCustomer: newCustomer,
    organizationAmountRef: organizationRef,
    categoryAmountRef: categoryRef,
    customerAmountRef: customerRef,
    frequency,
    duplicateMatchCount: duplicates,
    categoryTrend,
  };

  const result = evaluateTransactionRisk(input);

  await db.transaction(async (tx) => {
    await tx.insert(riskEvents).values({
      organizationId,
      transactionId,
      score: result.score,
      level: result.level,
      status: "UNREVIEWED",
      signals: result.signals,
    });
    await tx
      .update(transactions)
      .set({ riskScore: result.score, riskLevel: result.level, riskStatus: "UNREVIEWED" })
      .where(eq(transactions.id, transactionId));
  });

  return result;
}

/** Never throws — a risk-evaluation failure must never block saving or
 * importing the transaction it's evaluating (brief: "preserve existing
 * functionality"). Callers that create/update/import transactions call
 * this instead of evaluateAndStoreRisk directly. */
export async function evaluateAndStoreRiskSafely(
  organizationId: string,
  transactionId: string
): Promise<void> {
  try {
    await evaluateAndStoreRisk(organizationId, transactionId);
  } catch (error) {
    logServerError("risk", "Risk evaluation failed", { organizationId, transactionId }, error);
  }
}

/**
 * Recalculates every transaction in an organization (or only those
 * never evaluated, via onlyMissing) — for historical imports done
 * before Phase 6, or after a change to the scoring logic itself.
 * Deliberately sequential, not Promise.all across transactions: the app
 * runs its Postgres pool at max: 1 per serverless instance (see
 * db/client.ts), so concurrent calls here would only queue on that one
 * connection anyway while holding more request memory open than a
 * simple loop.
 */
export async function recalculateRiskForOrganization(
  organizationId: string,
  options: { onlyMissing?: boolean } = {}
): Promise<{ evaluated: number }> {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      options.onlyMissing
        ? and(eq(transactions.organizationId, organizationId), sql`${transactions.riskLevel} is null`)
        : eq(transactions.organizationId, organizationId)
    );

  let evaluated = 0;
  for (const { id } of rows) {
    const result = await evaluateAndStoreRisk(organizationId, id);
    if (result) evaluated += 1;
  }
  return { evaluated };
}

/** Convenience for the imports flow — evaluates every transaction
 * inserted by one committed import, found via the sourceRecordId
 * provenance imports.ts already writes (`${importId}:row-N`), so
 * commitImport itself doesn't need to change its return shape. */
export async function recalculateRiskForImport(
  organizationId: string,
  importId: string
): Promise<{ evaluated: number }> {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        sql`${transactions.sourceRecordId} LIKE ${importId + ":row-%"}`
      )
    );

  let evaluated = 0;
  for (const { id } of rows) {
    const result = await evaluateAndStoreRisk(organizationId, id);
    if (result) evaluated += 1;
  }
  return { evaluated };
}

export async function updateRiskReviewStatus(
  organizationId: string,
  transactionId: string,
  userId: string,
  status: Extract<RiskStatus, "REVIEWED" | "DISMISSED">
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select({ id: riskEvents.id })
      .from(riskEvents)
      .where(and(eq(riskEvents.organizationId, organizationId), eq(riskEvents.transactionId, transactionId)))
      .orderBy(desc(riskEvents.createdAt))
      .limit(1);
    if (!latest) return false;

    await tx
      .update(riskEvents)
      .set({ status, reviewedByUserId: userId, reviewedAt: new Date() })
      .where(eq(riskEvents.id, latest.id));

    const [updated] = await tx
      .update(transactions)
      .set({ riskStatus: status })
      .where(and(eq(transactions.id, transactionId), eq(transactions.organizationId, organizationId)))
      .returning({ id: transactions.id });

    return Boolean(updated);
  });
}

export interface RiskSummary {
  counts: Record<RiskLevel, number>;
  totalAnalyzed: number;
  /** Unreviewed MEDIUM/HIGH/CRITICAL transactions — LOW-risk items are
   * never counted as "requiring review" (brief: don't spam for every
   * low-risk transaction). */
  requiringReview: number;
}

export async function getRiskSummary(organizationId: string): Promise<RiskSummary> {
  const rows = await db
    .select({
      level: transactions.riskLevel,
      status: transactions.riskStatus,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(and(eq(transactions.organizationId, organizationId), sql`${transactions.riskLevel} is not null`))
    .groupBy(transactions.riskLevel, transactions.riskStatus);

  const counts: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let totalAnalyzed = 0;
  let requiringReview = 0;
  for (const r of rows) {
    const n = Number(r.count);
    totalAnalyzed += n;
    if (r.level) {
      counts[r.level] += n;
      if (r.status === "UNREVIEWED" && r.level !== "LOW") requiringReview += n;
    }
  }
  return { counts, totalAnalyzed, requiringReview };
}

export interface RecentAnomaly {
  transactionId: string;
  score: number;
  level: RiskLevel;
  createdAt: Date;
  topSignal: string | null;
}

export async function getRecentAnomalies(organizationId: string, limit = 5): Promise<RecentAnomaly[]> {
  const rows = await db
    .select({
      transactionId: riskEvents.transactionId,
      score: riskEvents.score,
      level: riskEvents.level,
      createdAt: riskEvents.createdAt,
      signals: riskEvents.signals,
    })
    .from(riskEvents)
    .where(and(eq(riskEvents.organizationId, organizationId), sql`${riskEvents.level} in ('HIGH','CRITICAL')`))
    .orderBy(desc(riskEvents.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    transactionId: r.transactionId,
    score: Number(r.score),
    level: r.level,
    createdAt: r.createdAt,
    topSignal: topSignalExplanation(r.signals),
  }));
}

function topSignalExplanation(signals: RiskSignal[]): string | null {
  if (!signals || signals.length === 0) return null;
  return signals.reduce((max, s) => (s.points > max.points ? s : max), signals[0]).explanation;
}

export interface ListRiskTransactionsOptions {
  page?: number;
  pageSize?: number;
  level?: RiskLevel;
  status?: RiskStatus;
  customerId?: string;
  category?: string;
  search?: string;
}

export interface RiskTransactionRow {
  id: string;
  date: string;
  description: string | null;
  category: string;
  counterparty: string | null;
  amount: string;
  currency: string;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  riskStatus: RiskStatus | null;
  topReason: string | null;
}

export interface ListRiskTransactionsResult {
  rows: RiskTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 25;

/** The risk-focused transaction table — filters/sorts on the
 * denormalized columns (fast, indexed — see
 * transactions_org_id_risk_level_idx), then a small follow-up query
 * fetches each visible row's latest risk_events entry to show its top
 * reason. Only ever touches risk_events for the current page (at most
 * `pageSize` ids), not the whole organization's history. */
export async function listRiskTransactions(
  organizationId: string,
  options: ListRiskTransactionsOptions = {}
): Promise<ListRiskTransactionsResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(transactions.organizationId, organizationId), sql`${transactions.riskLevel} is not null`];
  if (options.level) conditions.push(eq(transactions.riskLevel, options.level));
  if (options.status) conditions.push(eq(transactions.riskStatus, options.status));
  if (options.customerId) conditions.push(eq(transactions.customerId, options.customerId));
  if (options.category) conditions.push(eq(transactions.category, options.category));
  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        sql`${transactions.description} ILIKE ${term}`,
        sql`${transactions.category} ILIKE ${term}`,
        sql`${transactions.counterparty} ILIKE ${term}`,
        sql`${transactions.referenceId} ILIKE ${term}`
      )!
    );
  }

  const where = and(...conditions);

  const [pageRows, [totalRow]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        category: transactions.category,
        counterparty: transactions.counterparty,
        amount: transactions.amount,
        currency: transactions.currency,
        riskScore: transactions.riskScore,
        riskLevel: transactions.riskLevel,
        riskStatus: transactions.riskStatus,
      })
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.riskScore), desc(transactions.date))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: sql<string>`count(*)` }).from(transactions).where(where),
  ]);

  const ids = pageRows.map((r) => r.id);
  const latestSignalsByTransaction = new Map<string, RiskSignal[]>();
  if (ids.length > 0) {
    const eventRows = await db
      .select({
        transactionId: riskEvents.transactionId,
        signals: riskEvents.signals,
        createdAt: riskEvents.createdAt,
      })
      .from(riskEvents)
      .where(inArray(riskEvents.transactionId, ids))
      .orderBy(desc(riskEvents.createdAt));
    // Rows arrive most-recent-first; only the first one seen per
    // transaction id is kept, i.e. the latest evaluation.
    for (const e of eventRows) {
      if (!latestSignalsByTransaction.has(e.transactionId)) {
        latestSignalsByTransaction.set(e.transactionId, e.signals);
      }
    }
  }

  const rows: RiskTransactionRow[] = pageRows.map((r) => ({
    ...r,
    topReason: topSignalExplanation(latestSignalsByTransaction.get(r.id) ?? []),
  }));

  const total = Number(totalRow?.value ?? 0);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface RiskHistoryEntry {
  id: string;
  score: number;
  level: RiskLevel;
  status: RiskStatus;
  signals: RiskSignal[];
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

/** Full risk_events history for one transaction, most recent first —
 * powers the transaction detail drawer's "why" section and, when a
 * transaction has been edited, shows how its risk changed over time. */
export async function getRiskHistoryForTransaction(
  organizationId: string,
  transactionId: string
): Promise<RiskHistoryEntry[]> {
  return db
    .select({
      id: riskEvents.id,
      score: riskEvents.score,
      level: riskEvents.level,
      status: riskEvents.status,
      signals: riskEvents.signals,
      reviewedByUserId: riskEvents.reviewedByUserId,
      reviewedAt: riskEvents.reviewedAt,
      createdAt: riskEvents.createdAt,
    })
    .from(riskEvents)
    .where(and(eq(riskEvents.organizationId, organizationId), eq(riskEvents.transactionId, transactionId)))
    .orderBy(desc(riskEvents.createdAt));
}

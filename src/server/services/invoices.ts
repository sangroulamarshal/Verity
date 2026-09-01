import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { invoices, customers, transactions } from "@/db/schema";
import { convertToTargetCurrency, FxRateUnavailableError } from "@/server/services/fx";
import type { ScheduledItem, ForecastConfidence } from "@/server/engines/forecast-engine";

export type Invoice = typeof invoices.$inferSelect;
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

// Statuses that represent outstanding (uncollected) money.
// These are the only ones that contribute to expected future cash flow.
// DRAFT → not committed. PAID → already received. CANCELLED → void.
const OUTSTANDING_STATUSES: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "OVERDUE",
];

export interface InvoiceInput {
  customerId?: string;
  invoiceNumber: string;
  status?: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  paidAmount?: number;
  clientName?: string;
  clientEmail?: string;
  description?: string;
  notes?: string;
  lineItems?: string; // JSON string
}

export interface ListInvoicesOptions {
  page?: number;
  pageSize?: number;
  status?: InvoiceStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ListInvoicesResult {
  rows: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

// ----------------------------------------------------------------------------
// FX helpers (same pattern as transactions service)
// ----------------------------------------------------------------------------

async function resolveBaseAmountFields(
  totalAmount: string,
  paidAmount: string,
  currency: string,
  baseCurrency: string
) {
  const converted = await convertToTargetCurrency(totalAmount, currency, baseCurrency);
  let basePaid = "0.00";
  if (Number(paidAmount) > 0) {
    const convertedPaid = await convertToTargetCurrency(paidAmount, currency, baseCurrency);
    basePaid = convertedPaid.convertedAmount;
  }

  return {
    baseTotalAmount: converted.convertedAmount,
    baseCurrency: converted.targetCurrency,
    exchangeRate: converted.rate.rate,
    exchangeRateSource: converted.rate.source,
    exchangeRateTime: converted.rate.time,
    basePaidAmount: basePaid,
  };
}

async function nextSequenceNumber(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${invoices.sequenceNumber})` })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));
  return (row?.max ?? 0) + 1;
}

// ----------------------------------------------------------------------------
// CRUD
// ----------------------------------------------------------------------------

export async function createInvoice(
  organizationId: string,
  baseCurrency: string,
  input: InvoiceInput
): Promise<Invoice> {
  const totalStr = input.totalAmount.toFixed(2);
  const paidStr = (input.paidAmount ?? 0).toFixed(2);

  const baseFields = await resolveBaseAmountFields(
    totalStr,
    paidStr,
    input.currency,
    baseCurrency
  );

  const seq = await nextSequenceNumber(organizationId);

  const [row] = await db
    .insert(invoices)
    .values({
      organizationId,
      customerId: input.customerId ?? null,
      invoiceNumber: input.invoiceNumber,
      status: input.status ?? "DRAFT",
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      totalAmount: totalStr,
      currency: input.currency,
      baseTotalAmount: baseFields.baseTotalAmount,
      baseCurrency: baseFields.baseCurrency,
      exchangeRate: baseFields.exchangeRate,
      exchangeRateSource: baseFields.exchangeRateSource,
      exchangeRateTime: baseFields.exchangeRateTime,
      paidAmount: paidStr,
      basePaidAmount: baseFields.basePaidAmount,
      clientName: input.clientName ?? null,
      clientEmail: input.clientEmail ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      lineItems: input.lineItems ?? null,
      sequenceNumber: seq,
    })
    .returning();
  return row;
}

export async function getInvoiceById(
  organizationId: string,
  id: string
): Promise<Invoice | null> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.organizationId, organizationId), eq(invoices.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listInvoices(
  organizationId: string,
  options: ListInvoicesOptions = {}
): Promise<ListInvoicesResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(invoices.organizationId, organizationId)];
  if (options.status) conditions.push(eq(invoices.status, options.status));
  if (options.customerId) conditions.push(eq(invoices.customerId, options.customerId));
  if (options.dateFrom) conditions.push(gte(invoices.dueDate, options.dateFrom));
  if (options.dateTo) conditions.push(lte(invoices.dueDate, options.dateTo));

  const where = and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(invoices).where(where).orderBy(desc(invoices.dueDate)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(invoices).where(where),
  ]);

  const total = Number(count);
  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function updateInvoice(
  organizationId: string,
  id: string,
  baseCurrency: string,
  input: Partial<InvoiceInput>
): Promise<Invoice | null> {
  const existing = await getInvoiceById(organizationId, id);
  if (!existing) return null;

  const updates: Partial<typeof invoices.$inferInsert> = { updatedAt: new Date() };

  if (input.status !== undefined) updates.status = input.status;
  if (input.issueDate !== undefined) updates.issueDate = input.issueDate;
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
  if (input.clientName !== undefined) updates.clientName = input.clientName ?? null;
  if (input.clientEmail !== undefined) updates.clientEmail = input.clientEmail ?? null;
  if (input.description !== undefined) updates.description = input.description ?? null;
  if (input.notes !== undefined) updates.notes = input.notes ?? null;
  if (input.lineItems !== undefined) updates.lineItems = input.lineItems ?? null;
  if (input.customerId !== undefined) updates.customerId = input.customerId ?? null;
  if (input.invoiceNumber !== undefined) updates.invoiceNumber = input.invoiceNumber;

  // Recompute base amounts if monetary fields changed
  if (input.totalAmount !== undefined || input.currency !== undefined || input.paidAmount !== undefined) {
    const totalStr = (input.totalAmount ?? Number(existing.totalAmount)).toFixed(2);
    const paidStr = (input.paidAmount ?? Number(existing.paidAmount)).toFixed(2);
    const currency = input.currency ?? existing.currency;

    const baseFields = await resolveBaseAmountFields(totalStr, paidStr, currency, baseCurrency);
    updates.totalAmount = totalStr;
    updates.currency = currency;
    updates.paidAmount = paidStr;
    updates.baseTotalAmount = baseFields.baseTotalAmount;
    updates.baseCurrency = baseFields.baseCurrency;
    updates.exchangeRate = baseFields.exchangeRate;
    updates.exchangeRateSource = baseFields.exchangeRateSource;
    updates.exchangeRateTime = baseFields.exchangeRateTime;
    updates.basePaidAmount = baseFields.basePaidAmount;
  }

  // Status-driven timestamps
  if (input.status === "SENT" && !existing.sentAt) updates.sentAt = new Date();
  if (input.status === "PAID" && !existing.paidAt) updates.paidAt = new Date();

  const [row] = await db
    .update(invoices)
    .set(updates)
    .where(and(eq(invoices.organizationId, organizationId), eq(invoices.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteInvoice(
  organizationId: string,
  id: string
): Promise<Invoice | null> {
  const [row] = await db
    .delete(invoices)
    .where(and(eq(invoices.organizationId, organizationId), eq(invoices.id, id)))
    .returning();
  return row ?? null;
}

export async function markInvoicePaid(
  organizationId: string,
  id: string,
  settledByTransactionId?: string
): Promise<Invoice | null> {
  const [row] = await db
    .update(invoices)
    .set({
      status: "PAID",
      paidAt: new Date(),
      settledByTransactionId: settledByTransactionId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.organizationId, organizationId), eq(invoices.id, id)))
    .returning();
  return row ?? null;
}

// ----------------------------------------------------------------------------
// Forecast integration -- the core of Phase 7B
// ----------------------------------------------------------------------------

/**
 * Customer payment behaviour derived from historical invoices for a
 * given customer. Used to adjust expected payment dates: if a customer
 * historically pays N days late, we shift their expected payment date
 * forward by N days in the forecast.
 */
export interface CustomerPaymentBehaviour {
  customerId: string;
  /** Average days between dueDate and actual payment (positive = late, negative = early). */
  avgDaysLate: number;
  /** How many paid invoices this behaviour is based on. */
  sampleSize: number;
  /** Qualitative label. */
  reliability: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Computes payment behaviour for customers that have relevant outstanding
 * invoices in the forecast window. Uses only PAID invoice history --
 * we measure what actually happened.
 *
 * Returns a Map<customerId, behaviour> for efficient lookup.
 */
async function getCustomerPaymentBehaviours(
  organizationId: string,
  customerIds: string[]
): Promise<Map<string, CustomerPaymentBehaviour>> {
  if (customerIds.length === 0) return new Map();

  // Query PAID invoices for these customers (only rows with a paidAt
  // timestamp -- those we actually know the settlement date for).
  const paidRows = await db
    .select({
      customerId: invoices.customerId,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "PAID"),
        inArray(invoices.customerId, customerIds),
        // Only count rows where we actually have the paid timestamp
        isNotNull(invoices.paidAt)
      )
    )
    .orderBy(desc(invoices.paidAt));

  // Group by customer and compute average days late
  const byCustomer = new Map<string, number[]>();
  for (const row of paidRows) {
    if (!row.customerId || !row.paidAt) continue;
    const due = new Date(`${row.dueDate}T00:00:00Z`);
    const paid = new Date(row.paidAt);
    const daysLate = Math.round((paid.getTime() - due.getTime()) / 86_400_000);
    const list = byCustomer.get(row.customerId) ?? [];
    list.push(daysLate);
    byCustomer.set(row.customerId, list);
  }

  const result = new Map<string, CustomerPaymentBehaviour>();
  for (const [customerId, delays] of byCustomer) {
    const sampleSize = delays.length;
    const avgDaysLate = delays.reduce((s, d) => s + d, 0) / sampleSize;
    const reliability: "HIGH" | "MEDIUM" | "LOW" =
      sampleSize >= 5 ? "HIGH" : sampleSize >= 2 ? "MEDIUM" : "LOW";
    result.set(customerId, { customerId, avgDaysLate, sampleSize, reliability });
  }

  return result;
}

/**
 * Returns all outstanding invoices as ScheduledItems for the forecast engine.
 *
 * Filtering rules (from the brief):
 *   ✓  SENT, VIEWED, PARTIALLY_PAID, OVERDUE  → included
 *   ✗  DRAFT   → not a financial commitment yet
 *   ✗  PAID    → money already received, would double-count INCOME transactions
 *   ✗  CANCELLED → void
 *
 * Amount used:
 *   PARTIALLY_PAID → baseTotalAmount - basePaidAmount (remaining balance)
 *   All others → baseTotalAmount
 *
 * Expected date adjustment:
 *   If the customer has a payment history, the due date is adjusted by
 *   their average days-late behaviour (capped at ±30 days to avoid
 *   projecting unrealistically far out).
 *   If no history: due date is used as-is.
 *
 * Confidence:
 *   OVERDUE → LOW  (past due and still unpaid -- collection less certain)
 *   Customer has HIGH reliability behaviour → MEDIUM (still not guaranteed)
 *   Default → MEDIUM
 */
export async function getOutstandingInvoicesAsScheduledItems(
  organizationId: string,
  forecastStart: string,
  forecastEnd: string
): Promise<ScheduledItem[]> {
  // Fetch all outstanding invoices. We cast a wider net than just the
  // forecast window for the due date -- an overdue invoice from last month
  // is still outstanding cash we expect to receive. We cap at 180 days
  // overdue to avoid projecting very old irrecoverable debts.
  const cutoffDate = new Date(`${forecastStart}T00:00:00Z`);
  cutoffDate.setDate(cutoffDate.getDate() - 180);
  const oldestDue = cutoffDate.toISOString().slice(0, 10);

  const outstandingRows = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        inArray(invoices.status, OUTSTANDING_STATUSES),
        // Include invoices due from 180 days ago (overdue) up through the forecast end
        gte(invoices.dueDate, oldestDue),
        // Only include invoices whose expected payment could fall within the window
        // (we'll further filter after date adjustment below)
      )
    )
    .orderBy(asc(invoices.dueDate));

  if (outstandingRows.length === 0) return [];

  // Get payment behaviour for all customers referenced
  const customerIds = [
    ...new Set(outstandingRows.map((r) => r.customerId).filter(Boolean) as string[]),
  ];
  const behaviours = await getCustomerPaymentBehaviours(organizationId, customerIds);

  const items: ScheduledItem[] = [];

  for (const invoice of outstandingRows) {
    // Amount = outstanding balance
    const total = Number(invoice.baseTotalAmount);
    const paid = Number(invoice.basePaidAmount);
    const outstanding = Math.max(0, total - paid);
    if (outstanding <= 0) continue; // fully paid despite status -- skip

    // Expected payment date adjustment
    let expectedDate = invoice.dueDate;
    const behaviour = invoice.customerId ? behaviours.get(invoice.customerId) : null;
    if (behaviour && behaviour.sampleSize >= 1) {
      // Cap adjustment at ±30 days
      const adjustment = Math.round(Math.max(-30, Math.min(30, behaviour.avgDaysLate)));
      const base = new Date(`${invoice.dueDate}T00:00:00Z`);
      base.setDate(base.getDate() + adjustment);
      expectedDate = base.toISOString().slice(0, 10);
    }

    // Only include items whose expected payment date falls within forecast window
    if (expectedDate < forecastStart || expectedDate > forecastEnd) continue;

    // Confidence
    let confidence: ForecastConfidence;
    if (invoice.status === "OVERDUE") {
      confidence = "LOW";
    } else if (behaviour && behaviour.reliability === "HIGH") {
      confidence = "MEDIUM";
    } else {
      confidence = "MEDIUM";
    }

    // Label
    const customerName = invoice.clientName ?? `Invoice ${invoice.invoiceNumber}`;
    const label = `${customerName} -- ${invoice.invoiceNumber}`;

    items.push({
      date: expectedDate,
      amount: outstanding,
      type: "INCOME",
      label,
      source: "INVOICE",
      confidence,
    });
  }

  return items;
}

// ----------------------------------------------------------------------------
// Summary helpers
// ----------------------------------------------------------------------------

export interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
  countOutstanding: number;
  countOverdue: number;
  baseCurrency: string;
}

export async function getInvoiceSummary(
  organizationId: string,
  baseCurrency: string
): Promise<InvoiceSummary> {
  const [row] = await db
    .select({
      totalOutstanding: sql<string>`coalesce(sum(${invoices.baseTotalAmount} - ${invoices.basePaidAmount}) filter (where ${invoices.status} = ANY(ARRAY['SENT','VIEWED','PARTIALLY_PAID','OVERDUE']::invoice_status[])), 0)`,
      totalOverdue: sql<string>`coalesce(sum(${invoices.baseTotalAmount} - ${invoices.basePaidAmount}) filter (where ${invoices.status} = 'OVERDUE'), 0)`,
      countOutstanding: sql<string>`count(*) filter (where ${invoices.status} = ANY(ARRAY['SENT','VIEWED','PARTIALLY_PAID','OVERDUE']::invoice_status[]))`,
      countOverdue: sql<string>`count(*) filter (where ${invoices.status} = 'OVERDUE')`,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));

  return {
    totalOutstanding: Number(row?.totalOutstanding ?? 0),
    totalOverdue: Number(row?.totalOverdue ?? 0),
    countOutstanding: Number(row?.countOutstanding ?? 0),
    countOverdue: Number(row?.countOverdue ?? 0),
    baseCurrency,
  };
}

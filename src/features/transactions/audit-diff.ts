import "server-only";
import type { Transaction } from "@/server/services/transactions";

/**
 * Field-level diff between a transaction's before/after state, stored in
 * audit_logs.metadata for TRANSACTION_UPDATED entries (brief section 17
 * — "the old value must not simply disappear"). Only includes fields
 * that actually changed, and only the display-relevant ones (internal
 * bookkeeping like updatedAt is never diffed).
 */
const DIFFED_FIELDS = [
  "date",
  "amount",
  "currency",
  "baseAmount",
  "baseCurrency",
  "type",
  "category",
  "counterparty",
  "paymentMethod",
  "description",
  "referenceId",
  "customerId",
] as const satisfies readonly (keyof Transaction)[];

export interface FieldChange {
  from: unknown;
  to: unknown;
}

export function diffTransaction(
  before: Transaction,
  after: Transaction
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};

  for (const field of DIFFED_FIELDS) {
    const from = before[field];
    const to = after[field];
    if (from !== to) {
      changes[field] = { from, to };
    }
  }

  return changes;
}

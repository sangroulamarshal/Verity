"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/server/services/transactions";
import { auditLogSafely } from "@/server/services/audit-log";
import { transactionSchema } from "./schema";

export interface TransactionFormState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
  /**
   * The raw submitted values, echoed back on failure so the form can use
   * them as its new defaults. Necessary because React 19 resets
   * uncontrolled <form> fields to their defaultValue once a form action
   * finishes — including on a failed submission, not just success — so
   * without this, fixing one invalid field would silently wipe every
   * other field the person had already filled in.
   */
  values?: {
    date?: string;
    amount?: string;
    currency?: string;
    type?: string;
    category?: string;
    description?: string;
    referenceId?: string;
  };
}

function parseTransactionFormData(formData: FormData) {
  return transactionSchema.safeParse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description"),
    referenceId: formData.get("referenceId"),
  });
}

function rawFormValues(formData: FormData): TransactionFormState["values"] {
  return {
    date: formData.get("date")?.toString(),
    amount: formData.get("amount")?.toString(),
    currency: formData.get("currency")?.toString(),
    type: formData.get("type")?.toString(),
    category: formData.get("category")?.toString(),
    description: formData.get("description")?.toString(),
    referenceId: formData.get("referenceId")?.toString(),
  };
}

export async function createTransactionAction(
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  const session = await verifySession();

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
  }

  const row = await createTransaction(session.organizationId, parsed.data);

  await auditLogSafely({
    action: "TRANSACTION_CREATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction",
    entityId: row.id,
  });

  revalidatePath("/transactions");
  return { success: true };
}

export async function updateTransactionAction(
  id: string,
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  const session = await verifySession();

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
  }

  const row = await updateTransaction(session.organizationId, id, parsed.data);
  if (!row) {
    // Generic — doesn't distinguish "no such transaction" from "belongs to
    // a different organization". See server/services/transactions.ts.
    return { message: "Transaction not found.", values: rawFormValues(formData) };
  }

  await auditLogSafely({
    action: "TRANSACTION_UPDATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction",
    entityId: row.id,
  });

  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteTransactionAction(id: string): Promise<void> {
  const session = await verifySession();

  const row = await deleteTransaction(session.organizationId, id);
  if (!row) {
    // Nothing to log or revalidate — silently a no-op for an id that
    // doesn't exist or isn't this organization's.
    return;
  }

  await auditLogSafely({
    action: "TRANSACTION_DELETED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction",
    entityId: id,
    // The row is gone after this — keep a snapshot of what was deleted,
    // since entityId alone won't resolve to anything afterward.
    metadata: {
      date: row.date,
      amount: row.amount,
      currency: row.currency,
      type: row.type,
      category: row.category,
    },
  });

  revalidatePath("/transactions");
}

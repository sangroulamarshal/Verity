"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
} from "@/server/services/transactions";
import { getOrganization } from "@/server/services/organizations";
import { FxRateUnavailableError } from "@/server/services/fx";
import { auditLogSafely } from "@/server/services/audit-log";
import { canWriteTransactions } from "@/lib/permissions";
import { transactionSchema } from "./schema";
import { diffTransaction } from "./audit-diff";

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
    counterparty?: string;
    paymentMethod?: string;
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
    counterparty: formData.get("counterparty"),
    paymentMethod: formData.get("paymentMethod"),
    description: formData.get("description"),
    referenceId: formData.get("referenceId"),
    presetId: formData.get("presetId"),
  });
}

function rawFormValues(formData: FormData): TransactionFormState["values"] {
  return {
    date: formData.get("date")?.toString(),
    amount: formData.get("amount")?.toString(),
    currency: formData.get("currency")?.toString(),
    type: formData.get("type")?.toString(),
    category: formData.get("category")?.toString(),
    counterparty: formData.get("counterparty")?.toString(),
    paymentMethod: formData.get("paymentMethod")?.toString(),
    description: formData.get("description")?.toString(),
    referenceId: formData.get("referenceId")?.toString(),
  };
}

/** FX failure -> a form-level message, never a saved guess. Brief section 25. */
function fxErrorMessage(error: FxRateUnavailableError, baseCurrency: string): string {
  return `Could not convert to ${baseCurrency}: exchange rate for ${error.sourceCurrency} \u2192 ${error.targetCurrency} is unavailable right now. Please try again shortly.`;
}

export async function createTransactionAction(
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  const session = await verifySession();

  if (!canWriteTransactions(session.role)) {
    return { message: "Your role doesn't have permission to add transactions." };
  }

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
  }

  const organization = await getOrganization(session.organizationId);
  const baseCurrency = organization?.baseCurrency ?? "GBP";

  let row;
  try {
    row = await createTransaction(session.organizationId, baseCurrency, parsed.data);
  } catch (error) {
    if (error instanceof FxRateUnavailableError) {
      return { message: fxErrorMessage(error, baseCurrency), values: rawFormValues(formData) };
    }
    // Anything else (DB error, unexpected exception) used to be
    // rethrown uncaught here. With useActionState, an action that
    // rejects instead of resolving leaves `pending` reset to false but
    // never updates `state` — so the button just flips back to "Add
    // transaction" with no error visible anywhere. Logging with a
    // greppable tag and returning a real message fixes that silence
    // for every future failure mode, not just the one we've seen.
    console.error("[transactions] createTransactionAction failed unexpectedly:", error);
    return {
      message: "Something went wrong saving this transaction. Please try again.",
      values: rawFormValues(formData),
    };
  }

  await auditLogSafely({
    action: "TRANSACTION_CREATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "transaction",
    entityId: row.id,
    metadata: {
      date: row.date,
      amount: row.amount,
      currency: row.currency,
      baseAmount: row.baseAmount,
      baseCurrency: row.baseCurrency,
      type: row.type,
      category: row.category,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTransactionAction(
  id: string,
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  const session = await verifySession();

  if (!canWriteTransactions(session.role)) {
    return { message: "Your role doesn't have permission to edit transactions." };
  }

  const parsed = parseTransactionFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
  }

  const organization = await getOrganization(session.organizationId);
  const baseCurrency = organization?.baseCurrency ?? "GBP";

  const before = await getTransactionById(session.organizationId, id);

  let row;
  try {
    row = await updateTransaction(session.organizationId, baseCurrency, id, parsed.data);
  } catch (error) {
    if (error instanceof FxRateUnavailableError) {
      return { message: fxErrorMessage(error, baseCurrency), values: rawFormValues(formData) };
    }
    // See the matching comment in createTransactionAction above.
    console.error("[transactions] updateTransactionAction failed unexpectedly:", error);
    return {
      message: "Something went wrong saving this transaction. Please try again.",
      values: rawFormValues(formData),
    };
  }

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
    metadata: before ? { changes: diffTransaction(before, row) } : undefined,
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTransactionAction(id: string): Promise<void> {
  const session = await verifySession();

  if (!canWriteTransactions(session.role)) {
    return;
  }

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
      baseAmount: row.baseAmount,
      baseCurrency: row.baseCurrency,
      type: row.type,
      category: row.category,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

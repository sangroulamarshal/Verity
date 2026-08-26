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

/**
 * Next.js implements redirect()/notFound() by throwing a special error
 * with a `digest` starting with "NEXT_REDIRECT"/"NEXT_HTTP_ERROR_FALLBACK"
 * — the framework's documented way of distinguishing these from real
 * errors when wrapping server code in a broad try/catch. verifySession()
 * calls redirect("/login") internally; a catch-all around it must let
 * that specific throw continue upward untouched; treating a real login
 * redirect as "something went wrong" would trap a logged-out user on a
 * broken form instead of sending them to /login.
 */
function isFrameworkControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

export async function createTransactionAction(
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  try {
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
      // Not FX-specific — fall through to the outer catch below, which
      // logs it and returns a generic message rather than crashing.
      throw error;
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
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;
    // Previously only the createTransaction() insert itself was
    // guarded. verifySession() and getOrganization() run before that,
    // and revalidatePath() after it — any of those throwing was still
    // uncaught, which is how this could still fail silently even with
    // the insert-specific guard in place. Wrapping the whole body
    // closes every remaining gap; a rejected action otherwise leaves
    // useActionState's `pending` reset to false with `state` never
    // updated, so the button just resets with nothing shown.
    console.error("[transactions] createTransactionAction failed unexpectedly:", error);
    return {
      message: "Something went wrong saving this transaction. Please try again.",
      values: rawFormValues(formData),
    };
  }
}

export async function updateTransactionAction(
  id: string,
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  try {
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
      throw error;
    }

    if (!row) {
      // Generic — doesn't distinguish "no such transaction" from "belongs
      // to a different organization". See server/services/transactions.ts.
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
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;
    // See the matching comment in createTransactionAction above.
    console.error("[transactions] updateTransactionAction failed unexpectedly:", error);
    return {
      message: "Something went wrong saving this transaction. Please try again.",
      values: rawFormValues(formData),
    };
  }
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

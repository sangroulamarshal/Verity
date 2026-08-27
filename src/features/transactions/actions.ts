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
import { logServerError } from "@/server/log";
import { canWriteTransactions } from "@/lib/permissions";
import { transactionSchema } from "./schema";
import { diffTransaction } from "./audit-diff";

export interface TransactionFormState {
  errors?: Record<string, string[] | undefined>;
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
  // FormData.get() returns null for a field that isn't in the form at
  // all — distinct from "" for a field that's present but empty. Every
  // optional-field schema below (optionalText, the paymentMethod enum)
  // only treats undefined/"" as "not provided" via .optional().or(z.literal("")) —
  // neither accepts a bare null, so it fails type validation outright.
  // presetId's hidden input is only rendered when creating from a
  // preset (see transaction-form.tsx), so a plain "Add transaction"
  // submits with no presetId field at all: formData.get("presetId")
  // was null, every one of those submissions failed validation with
  // {"presetId":["Invalid input"]} — a real, correctly-returned error
  // that the form has no visible slot to display, since presetId isn't
  // a rendered form control. Normalizing null -> "" here fixes the
  // actual field and guards every other optional field the same way,
  // so no future conditionally-rendered field can hit this silently.
  const get = (name: string) => formData.get(name) ?? "";
  return transactionSchema.safeParse({
    date: get("date"),
    amount: get("amount"),
    currency: get("currency"),
    type: get("type"),
    category: get("category"),
    counterparty: get("counterparty"),
    paymentMethod: get("paymentMethod"),
    description: get("description"),
    referenceId: get("referenceId"),
    presetId: get("presetId"),
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

// Every field the form actually renders a {state.errors?.x && <p>...}
// block for. presetId is deliberately absent — it's a hidden field
// with no visible slot to show an error in (see transaction-form.tsx).
// This is what let the null/undefined presetId bug above produce a
// correctly-returned error that was nonetheless invisible to the
// person using the form.
const FIELDS_WITH_VISIBLE_ERRORS = new Set([
  "date",
  "amount",
  "currency",
  "type",
  "category",
  "counterparty",
  "paymentMethod",
  "description",
  "referenceId",
]);

/**
 * A validation failure always gets its errors returned, but a field
 * error the form has no visible slot for is otherwise silent — exactly
 * how the presetId bug above went unnoticed. Falling back to a
 * top-of-form message whenever that happens means any future field
 * with the same gap fails loudly instead of quietly, without needing
 * every new field to remember to wire up its own error display.
 */
function validationFailureState(
  errors: Record<string, string[] | undefined>,
  formData: FormData
): TransactionFormState {
  const hasInvisibleFieldError = Object.keys(errors).some(
    (field) => !FIELDS_WITH_VISIBLE_ERRORS.has(field)
  );
  return {
    errors,
    values: rawFormValues(formData),
    message: hasInvisibleFieldError
      ? "This transaction couldn't be validated. Please try again, and let us know if this keeps happening."
      : undefined,
  };
}

export async function createTransactionAction(
  _prevState: TransactionFormState | undefined,
  formData: FormData
): Promise<TransactionFormState> {
  // Declared outside the try so the catch below can still identify whose
  // submission this was, even if the failure happened after verifySession()
  // resolved (the common case — a login-redirect failure is caught by
  // isFrameworkControlFlowError and rethrown before ever reaching here).
  let session: Awaited<ReturnType<typeof verifySession>> | undefined;
  try {
    session = await verifySession();

    if (!canWriteTransactions(session.role)) {
      return { message: "Your role doesn't have permission to add transactions." };
    }

    const parsed = parseTransactionFormData(formData);
    if (!parsed.success) {
      return validationFailureState(parsed.error.flatten().fieldErrors, formData);
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
    logServerError(
      "transactions",
      "createTransactionAction failed unexpectedly",
      { organizationId: session?.organizationId, userId: session?.userId },
      error
    );
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
  // See the matching comment in createTransactionAction — hoisted so a
  // failure can still be logged with who/what it belonged to.
  let session: Awaited<ReturnType<typeof verifySession>> | undefined;
  try {
    session = await verifySession();

    if (!canWriteTransactions(session.role)) {
      return { message: "Your role doesn't have permission to edit transactions." };
    }

    const parsed = parseTransactionFormData(formData);
    if (!parsed.success) {
      return validationFailureState(parsed.error.flatten().fieldErrors, formData);
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
    logServerError(
      "transactions",
      "updateTransactionAction failed unexpectedly",
      { transactionId: id, organizationId: session?.organizationId, userId: session?.userId },
      error
    );
    return {
      message: "Something went wrong saving this transaction. Please try again.",
      values: rawFormValues(formData),
    };
  }
}

export interface DeleteTransactionResult {
  success: boolean;
  message?: string;
}

/**
 * Previously had no try/catch at all — any thrown error (a DB blip, a
 * connection timeout) became an unhandled rejection inside the client's
 * `startTransition(async () => { await deleteTransactionAction(id) })`,
 * which React does not surface to any error boundary. The button's
 * `isPending` still resets to false once the promise settles either way,
 * so the net effect was identical to the original "Add transaction"
 * silent-failure bug: click Delete, nothing happens, nothing shown,
 * nothing logged. Now returns a real result the button renders, and any
 * unexpected failure is caught, logged with which transaction/org/user
 * it was, and reported back instead of vanishing.
 */
export async function deleteTransactionAction(id: string): Promise<DeleteTransactionResult> {
  let session: Awaited<ReturnType<typeof verifySession>> | undefined;
  try {
    session = await verifySession();

    if (!canWriteTransactions(session.role)) {
      return { success: false, message: "Your role doesn't have permission to delete transactions." };
    }

    const row = await deleteTransaction(session.organizationId, id);
    if (!row) {
      // Not an error state — most commonly a double-click racing itself,
      // or a stale row from another tab. Either way the end state the
      // person wanted (this transaction is gone) already holds, so this
      // reports success rather than a scary, misleading error.
      revalidatePath("/transactions");
      revalidatePath("/dashboard");
      return { success: true };
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
    return { success: true };
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;
    logServerError(
      "transactions",
      "deleteTransactionAction failed unexpectedly",
      { transactionId: id, organizationId: session?.organizationId, userId: session?.userId },
      error
    );
    return { success: false, message: "Something went wrong deleting this transaction. Please try again." };
  }
}

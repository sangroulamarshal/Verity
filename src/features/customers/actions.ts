"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/server/services/customers";
import { auditLogSafely } from "@/server/services/audit-log";
import { logServerError } from "@/server/log";
import { canWriteCustomers } from "@/lib/permissions";
import { customerSchema } from "./schema";

export interface CustomerFormState {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
  /** Echoed back on failure — see the identical field on
   * TransactionFormState in features/transactions/actions.ts for why:
   * React resets uncontrolled form fields to defaultValue on every
   * action result, including a failed one. */
  values?: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
}

function parseCustomerFormData(formData: FormData) {
  // FormData.get() of a field that isn't in the form at all returns
  // null, not "" — this codebase has one documented bug already caused
  // by trusting that a missing field would parse the same as an empty
  // one (see the presetId comment in features/transactions/actions.ts).
  // Every field this form actually renders is present either way, so
  // there's no un-rendered-field gap here the way there was there, but
  // normalizing null -> "" is done unconditionally regardless, so this
  // stays correct even if a future field is ever made conditional.
  const get = (name: string) => formData.get(name) ?? "";
  return customerSchema.safeParse({
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    notes: get("notes"),
  });
}

function rawFormValues(formData: FormData): CustomerFormState["values"] {
  return {
    name: formData.get("name")?.toString(),
    email: formData.get("email")?.toString(),
    phone: formData.get("phone")?.toString(),
    notes: formData.get("notes")?.toString(),
  };
}

/** Same NEXT_REDIRECT/NEXT_HTTP_ERROR_FALLBACK carve-out as
 * features/transactions/actions.ts's isFrameworkControlFlowError —
 * see that file's comment for the full reasoning. Duplicated rather
 * than imported: features/*​/actions.ts files don't import from each
 * other (see docs/ARCHITECTURE.md's layering rule — "No cross-feature
 * imports"). */
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

export async function createCustomerAction(
  _prevState: CustomerFormState | undefined,
  formData: FormData
): Promise<CustomerFormState> {
  let session: Awaited<ReturnType<typeof verifySession>> | undefined;
  try {
    session = await verifySession();

    if (!canWriteCustomers(session.role)) {
      return { message: "Your role doesn't have permission to add customers." };
    }

    const parsed = parseCustomerFormData(formData);
    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
    }

    const row = await createCustomer(session.organizationId, parsed.data);

    await auditLogSafely({
      action: "CUSTOMER_CREATED",
      organizationId: session.organizationId,
      userId: session.userId,
      entityType: "customer",
      entityId: row.id,
      metadata: { name: row.name, email: row.email, phone: row.phone },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;
    logServerError(
      "customers",
      "createCustomerAction failed unexpectedly",
      { organizationId: session?.organizationId, userId: session?.userId },
      error
    );
    return {
      message: "Something went wrong saving this customer. Please try again.",
      values: rawFormValues(formData),
    };
  }
}

export async function updateCustomerAction(
  id: string,
  _prevState: CustomerFormState | undefined,
  formData: FormData
): Promise<CustomerFormState> {
  let session: Awaited<ReturnType<typeof verifySession>> | undefined;
  try {
    session = await verifySession();

    if (!canWriteCustomers(session.role)) {
      return { message: "Your role doesn't have permission to edit customers." };
    }

    const parsed = parseCustomerFormData(formData);
    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors, values: rawFormValues(formData) };
    }

    const row = await updateCustomer(session.organizationId, id, parsed.data);
    if (!row) {
      // Generic — doesn't distinguish "no such customer" from "belongs
      // to a different organization". See server/services/customers.ts.
      return { message: "Customer not found.", values: rawFormValues(formData) };
    }

    await auditLogSafely({
      action: "CUSTOMER_UPDATED",
      organizationId: session.organizationId,
      userId: session.userId,
      entityType: "customer",
      entityId: row.id,
      metadata: { name: row.name, email: row.email, phone: row.phone },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true };
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;
    logServerError(
      "customers",
      "updateCustomerAction failed unexpectedly",
      { customerId: id, organizationId: session?.organizationId, userId: session?.userId },
      error
    );
    return {
      message: "Something went wrong saving this customer. Please try again.",
      values: rawFormValues(formData),
    };
  }
}

export interface DeleteCustomerResult {
  success: boolean;
  message?: string;
}

/**
 * Same result-returning shape as deleteTransactionAction (see that
 * file's comment for why a bare Promise<void> is the wrong contract
 * for a client-invoked action — an uncaught rejection there becomes an
 * invisible failure with nothing logged or shown).
 */
export async function deleteCustomerAction(id: string): Promise<DeleteCustomerResult> {
  let session: Awaited<ReturnType<typeof verifySession>> | undefined;
  try {
    session = await verifySession();

    if (!canWriteCustomers(session.role)) {
      return { success: false, message: "Your role doesn't have permission to delete customers." };
    }

    const row = await deleteCustomer(session.organizationId, id);
    if (!row) {
      // Not an error — double-click racing itself, or already deleted
      // from another tab. The end state the person wanted already holds.
      revalidatePath("/customers");
      return { success: true };
    }

    await auditLogSafely({
      action: "CUSTOMER_DELETED",
      organizationId: session.organizationId,
      userId: session.userId,
      entityType: "customer",
      entityId: id,
      metadata: { name: row.name, email: row.email, phone: row.phone },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    if (isFrameworkControlFlowError(error)) throw error;
    logServerError(
      "customers",
      "deleteCustomerAction failed unexpectedly",
      { customerId: id, organizationId: session?.organizationId, userId: session?.userId },
      error
    );
    return { success: false, message: "Something went wrong deleting this customer. Please try again." };
  }
}

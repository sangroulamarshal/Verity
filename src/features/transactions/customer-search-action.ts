"use server";

import { verifySession } from "@/server/services/session";
import { searchCustomersForPicker, type CustomerPickerResult } from "@/server/services/customers";
import { logServerError } from "@/server/log";

/**
 * Backs customer-picker.tsx. This is the transactions feature's own
 * thin wrapper around server/services/customers.ts's
 * searchCustomersForPicker, rather than importing an action from
 * features/customers/, per docs/ARCHITECTURE.md's layering rule
 * (features under features/ must not import from each other).
 */
export async function searchCustomersForTransactionAction(
  query: string
): Promise<CustomerPickerResult[]> {
  try {
    const session = await verifySession();
    return await searchCustomersForPicker(session.organizationId, query);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    logServerError("transactions", "searchCustomersForTransactionAction failed unexpectedly", {}, error);
    return [];
  }
}

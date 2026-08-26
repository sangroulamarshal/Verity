"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { updatePreferences } from "@/server/services/account";
import { auditLogSafely } from "@/server/services/audit-log";
import { preferencesSchema } from "./schema";

export interface PreferencesFormState {
  success?: boolean;
  message?: string;
}

export async function updatePreferencesAction(
  _prevState: PreferencesFormState | undefined,
  formData: FormData
): Promise<PreferencesFormState> {
  const session = await verifySession();

  const parsed = preferencesSchema.safeParse({
    dateFormat: formData.get("dateFormat"),
    defaultTransactionView: formData.get("defaultTransactionView"),
  });
  if (!parsed.success) {
    return { message: "Could not save preferences." };
  }

  await updatePreferences(session.userId, parsed.data);

  await auditLogSafely({
    action: "PREFERENCES_UPDATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "user",
    entityId: session.userId,
    metadata: { kind: "display" },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { updateNotificationPreferences } from "@/server/services/account";
import { auditLogSafely } from "@/server/services/audit-log";
import { notificationPreferencesSchema } from "./schema";

export interface NotificationFormState {
  success?: boolean;
  message?: string;
}

export async function updateNotificationPreferencesAction(
  _prevState: NotificationFormState | undefined,
  formData: FormData
): Promise<NotificationFormState> {
  const session = await verifySession();

  const parsed = notificationPreferencesSchema.safeParse({
    importCompleted: formData.get("importCompleted") === "on",
    newLogin: formData.get("newLogin") === "on",
    passwordChanged: formData.get("passwordChanged") === "on",
  });
  if (!parsed.success) {
    return { message: "Could not save preferences." };
  }

  await updateNotificationPreferences(session.userId, parsed.data);

  await auditLogSafely({
    action: "PREFERENCES_UPDATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "user",
    entityId: session.userId,
    metadata: { kind: "notifications" },
  });

  revalidatePath("/settings/notifications");
  return { success: true };
}

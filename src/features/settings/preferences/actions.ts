"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { updatePreferences } from "@/server/services/account";
import { auditLogSafely } from "@/server/services/audit-log";
import { preferencesSchema, themeSchema } from "./schema";

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

/**
 * Persists the account's theme preference — previously the header
 * ThemeToggle and this page's AppearanceControl only ever called
 * next-themes' setTheme(), which writes to this browser's localStorage
 * and nowhere else. That's why the preference "reset" whenever local
 * storage/cache was cleared, or on a different browser/device entirely:
 * it was never actually saved to the account. This is the DB-backed
 * counterpart, called alongside setTheme() (for instant visual
 * feedback) from both of those components — see use-account-theme.ts.
 *
 * Lightweight/standalone like setDisplayCurrencyAction above: fired
 * from client components on every theme change, not part of a
 * multi-field form submission, so it takes the value directly rather
 * than FormData.
 */
export async function setThemeAction(theme: string): Promise<void> {
  const session = await verifySession();
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return;

  await updatePreferences(session.userId, { theme: parsed.data });
  // Layout-wide, same as setDisplayCurrencyAction in
  // features/settings/account/actions.ts: (app)/layout.tsx resolves the
  // saved theme fresh on every authenticated page render.
  revalidatePath("/", "layout");
}

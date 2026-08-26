"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { updateProfile } from "@/server/services/account";
import { auditLogSafely } from "@/server/services/audit-log";
import { profileSchema } from "./schema";
import { DISPLAY_CURRENCIES } from "@/lib/currency";

export interface ProfileFormState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

export async function updateProfileAction(
  _prevState: ProfileFormState | undefined,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await verifySession();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    timezone: formData.get("timezone"),
    displayCurrency: formData.get("displayCurrency"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await updateProfile(session.userId, {
    fullName: parsed.data.fullName ?? null,
    phone: parsed.data.phone ?? null,
    timezone: parsed.data.timezone ?? null,
    displayCurrency: parsed.data.displayCurrency ?? null,
  });

  await auditLogSafely({
    action: "ACCOUNT_UPDATED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "user",
    entityId: session.userId,
  });

  // Every page reads session.displayCurrency from a cached
  // getOptionalSession() call — revalidating the whole layout segment
  // (not just /settings/account) is what makes a changed display
  // currency show up on /transactions and /dashboard immediately.
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Lightweight sibling to updateProfileAction — the header's currency
 * selector needs to persist just this one field without resubmitting
 * the whole Account form, and without a page navigation (it's used from
 * inside the app shell on every page, not just /settings/account).
 */
export async function setDisplayCurrencyAction(currency: string): Promise<void> {
  const session = await verifySession();
  if (!(DISPLAY_CURRENCIES as readonly string[]).includes(currency)) return;

  await updateProfile(session.userId, { displayCurrency: currency });
  revalidatePath("/", "layout");
}

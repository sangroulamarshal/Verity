"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { createClient } from "@/lib/supabase/server";
import { auditLogSafely } from "@/server/services/audit-log";
import { changePasswordSchema, changeEmailSchema } from "./schema";

export interface SecurityFormState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

export async function changePasswordAction(
  _prevState: SecurityFormState | undefined,
  formData: FormData
): Promise<SecurityFormState> {
  const session = await verifySession();

  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return { message: error.message };
  }

  await auditLogSafely({
    action: "PASSWORD_CHANGED",
    organizationId: session.organizationId,
    userId: session.userId,
  });

  return { success: true };
}

export async function changeEmailAction(
  _prevState: SecurityFormState | undefined,
  formData: FormData
): Promise<SecurityFormState> {
  const session = await verifySession();

  const parsed = changeEmailSchema.safeParse({ newEmail: formData.get("newEmail") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ email: parsed.data.newEmail });
  if (error) {
    return { message: error.message };
  }

  // Supabase projects with "Confirm email" enabled don't apply the new
  // address until the confirmation link is clicked — `data.user.email`
  // still reports the *old* address in that case, same ambiguity
  // registerAction already handles (see features/auth/actions.ts). Only
  // sync the local `users.email` mirror when Supabase confirms it took
  // effect immediately; otherwise the auth callback / next login is
  // where a fuller implementation would pick up the confirmed change —
  // not implemented in this pass, since it needs a dedicated Supabase
  // webhook or callback branch this MVP doesn't have yet.
  if (data.user?.email === parsed.data.newEmail) {
    await db.update(users).set({ email: parsed.data.newEmail, updatedAt: new Date() }).where(eq(users.id, session.userId));
  }

  await auditLogSafely({
    action: "EMAIL_CHANGE_REQUESTED",
    organizationId: session.organizationId,
    userId: session.userId,
    metadata: { newEmail: parsed.data.newEmail },
  });

  return {
    success: true,
    message:
      data.user?.email === parsed.data.newEmail
        ? undefined
        : "Check both your old and new inbox to confirm the change.",
  };
}

export async function signOutAllSessionsAction(): Promise<void> {
  const session = await verifySession();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });

  await auditLogSafely({
    action: "SIGNED_OUT_ALL_SESSIONS",
    organizationId: session.organizationId,
    userId: session.userId,
  });

  redirect("/login");
}

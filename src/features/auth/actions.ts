"use server";

import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, users, organizationInvites } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { getOptionalSession } from "@/server/services/session";
import { auditLogSafely } from "@/server/services/audit-log";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "./schema";

export interface AuthFormState {
  errors?: Record<string, string[]>;
  message?: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Creates the org + user row that links a Supabase Auth identity to our
 * own domain data. Shared by password registration and the OAuth
 * callback — both need the exact same "first time we've seen this
 * Supabase user id" provisioning step.
 *
 * Checks for a pending organization invite matching this email first
 * (Settings > Members — brief section 37): if one exists, this person
 * joins that organization with the invited role instead of getting a
 * brand-new organization auto-provisioned. `organizationName` is only
 * used in the no-invite path.
 */
export async function provisionOrganization(input: {
  organizationName: string;
  email: string;
  supabaseUserId: string;
}) {
  const normalizedEmail = input.email.toLowerCase().trim();

  const [pendingInvite] = await db
    .select()
    .from(organizationInvites)
    .where(and(eq(organizationInvites.email, normalizedEmail), isNull(organizationInvites.acceptedAt)))
    .limit(1);

  if (pendingInvite) {
    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          organizationId: pendingInvite.organizationId,
          email: input.email,
          supabaseUserId: input.supabaseUserId,
          role: pendingInvite.role,
        })
        .returning({ id: users.id, organizationId: users.organizationId });

      await tx
        .update(organizationInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvites.id, pendingInvite.id));

      return user;
    });
  }

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: input.organizationName })
      .returning({ id: organizations.id });

    const [user] = await tx
      .insert(users)
      .values({
        organizationId: org.id,
        email: input.email,
        supabaseUserId: input.supabaseUserId,
        // No explicit role — defaults to OWNER (see db/schema/users.ts),
        // correct here since this branch always creates a brand-new
        // organization that this user is the founder of.
      })
      .returning({ id: users.id, organizationId: users.organizationId });

    return user;
  });
}

export async function registerAction(
  _prevState: AuthFormState | undefined,
  formData: FormData
): Promise<AuthFormState> {
  const ip = await getClientIp();
  const rateLimit = checkRateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { message: "Too many registration attempts. Please try again later." };
  }

  const parsed = registerSchema.safeParse({
    organizationName: formData.get("organizationName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { organizationName, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return {
      errors: { email: ["This email is already registered. Try logging in instead."] },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error) {
    return { message: error.message };
  }
  if (!data.user) {
    return { message: "Something went wrong creating your account. Please try again." };
  }

  const newUser = await provisionOrganization({
    organizationName,
    email,
    supabaseUserId: data.user.id,
  });

  await auditLogSafely({
    action: "USER_REGISTERED",
    organizationId: newUser.organizationId,
    userId: newUser.id,
  });

  // If the Supabase project requires email confirmation, `data.session`
  // is null here even though the account was created — there's no active
  // session until the user clicks the link in their inbox. If the project
  // has confirmation disabled, a session comes back immediately and we
  // can send them straight in. Both are valid project configurations, so
  // both are handled rather than assuming one.
  if (!data.session) {
    redirect("/register/check-email");
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState | undefined,
  formData: FormData
): Promise<AuthFormState> {
  const ip = await getClientIp();
  const ipLimit = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return { message: "Too many login attempts. Please try again later." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  // Per-account limit, independent of IP — protects one account from
  // distributed brute force across many source IPs.
  const accountLimit = checkRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
  if (!accountLimit.allowed) {
    return { message: "Too many login attempts for this account. Please try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await auditLogSafely({ action: "LOGIN_FAILED", metadata: { email } });

    // Not a sensitive detail to surface (unlike "this email doesn't
    // exist") — the person already knows they just registered this
    // email, so confirming it needs verification isn't an enumeration
    // risk the way confirming account existence would be.
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        message: "Please verify your email before logging in — check your inbox for the link.",
      };
    }
    return { message: "Invalid email or password." };
  }
  if (!data.user) {
    return { message: "Invalid email or password." };
  }

  const [row] = await db
    .select({ id: users.id, organizationId: users.organizationId })
    .from(users)
    .where(eq(users.supabaseUserId, data.user.id))
    .limit(1);

  if (!row) {
    // Authenticated with Supabase but no linked org row — shouldn't
    // happen for a password account (provisioned at signUp time), but
    // fail closed rather than let a half-provisioned identity in.
    return { message: "Your account isn't fully set up yet. Please contact support." };
  }

  await auditLogSafely({
    action: "LOGIN_SUCCEEDED",
    organizationId: row.organizationId,
    userId: row.id,
  });

  redirect("/dashboard");
}

/**
 * Google sign-in is a Server Action (used as a plain `<form action={...}>`
 * submit) rather than client-side Supabase JS: `signInWithOAuth` just
 * needs to build the Google consent-screen URL and redirect there, which
 * a server action can do directly — no browser-side Supabase client
 * needed for this flow.
 */
export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=google_oauth_failed");
  }

  redirect(data.url);
}

export async function logoutAction(): Promise<void> {
  const session = await getOptionalSession();
  const supabase = await createClient();
  await supabase.auth.signOut();

  if (session) {
    await auditLogSafely({
      action: "LOGOUT",
      organizationId: session.organizationId,
      userId: session.userId,
    });
  }

  redirect("/login");
}

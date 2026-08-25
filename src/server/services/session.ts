import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedSession {
  userId: string;
  organizationId: string;
  email: string;
}

/**
 * The authoritative session check — the Data Access Layer boundary.
 * Credentials, sessions, and Google OAuth are now entirely owned by
 * Supabase Auth; this function's only remaining job is to confirm
 * Supabase considers the request authenticated (via `getUser()`, which
 * revalidates with Supabase's Auth server rather than just decoding a
 * JWT — see proxy.ts for why that distinction matters) and then resolve
 * that identity to *our* domain data — organizationId — via the local
 * `users` table.
 *
 * Wrapped in React's `cache()` so multiple calls during the same render
 * pass (layout + page + nested components) only do this once per request.
 *
 * This is intentionally NOT the only auth check in the app — proxy.ts
 * also calls `getUser()` for fast redirects, but this is the real
 * boundary every protected Server Component, Server Action, and Route
 * Handler must call before touching organization data, since it's the
 * one that also resolves organizationId.
 */
export const verifySession = cache(async (): Promise<AuthenticatedSession> => {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

/**
 * Same authoritative check as `verifySession`, but returns `null` instead
 * of redirecting. Use this where the caller needs to branch on auth state
 * itself (e.g. a page that renders differently when logged out) rather
 * than unconditionally requiring a session.
 */
export const getOptionalSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [row] = await db
    .select({
      userId: users.id,
      organizationId: users.organizationId,
      email: users.email,
    })
    .from(users)
    .where(eq(users.supabaseUserId, user.id))
    .limit(1);

  // Authenticated with Supabase but no linked organization/user row yet.
  // Shouldn't happen in steady state — registerAction and the OAuth
  // callback route both provision this row immediately — but treating it
  // as "not signed in" here (rather than throwing) fails safe rather than
  // leaking a half-provisioned session into protected pages.
  return row ?? null;
});

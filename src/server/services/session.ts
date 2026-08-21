import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "@/lib/session-token";

export interface AuthenticatedSession {
  userId: string;
  organizationId: string;
  email: string;
}

/**
 * Creates a DB-backed session for `userId` and sets the session cookie.
 * Call this after a successful login or registration.
 */
export async function createSession(userId: string): Promise<void> {
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const userAgent = (await headers()).get("user-agent");

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Deletes the current session, both the DB row and the cookie. Call this
 * on logout. Safe to call even if there's no active session.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(rawToken)));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * The authoritative session check — the Data Access Layer boundary.
 * Always hits the database (never trusts the cookie's mere presence),
 * which is what makes a session actually revocable: deleting the DB row
 * invalidates the session immediately even though the signed cookie the
 * browser holds hasn't "expired" from the browser's point of view.
 *
 * Wrapped in React's `cache()` so multiple calls during the same render
 * pass (layout + page + nested components) only hit the database once.
 *
 * This is intentionally NOT done in proxy.ts — Next.js's own guidance is
 * that Proxy should only do optimistic, cookie-presence-based redirects
 * and must not be the sole authorization boundary. This function is the
 * real boundary; every protected Server Component, Server Action, and
 * Route Handler must call it before touching organization data.
 */
export const verifySession = cache(async (): Promise<AuthenticatedSession> => {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

/**
 * Same authoritative DB check as `verifySession`, but returns `null`
 * instead of redirecting. Use this where the caller needs to branch on
 * auth state itself (e.g. the proxy's public/auth pages, or a page that
 * renders differently when logged out) rather than unconditionally
 * requiring a session.
 */
export const getOptionalSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);

  const rows = await db
    .select({
      userId: users.id,
      organizationId: users.organizationId,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
});

import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export interface UpdateProfileInput {
  fullName?: string | null;
  phone?: string | null;
  timezone?: string | null;
  displayCurrency?: string | null;
  avatarUrl?: string | null;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const [row] = await db
    .update(users)
    .set({
      fullName: input.fullName ?? null,
      phone: input.phone ?? null,
      timezone: input.timezone ?? null,
      displayCurrency: input.displayCurrency ?? null,
      avatarUrl: input.avatarUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

export interface PreferenceBag {
  [key: string]: string | boolean | undefined;
}

export async function updateNotificationPreferences(userId: string, prefs: PreferenceBag) {
  const [row] = await db
    .update(users)
    .set({ notificationPreferences: prefs, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

/**
 * Merges into the stored `preferences` JSONB blob rather than replacing
 * it wholesale. This is deliberately NOT `.set({ preferences: prefs })`
 * — this function is called from more than one place with a *partial*
 * preference bag (the main Preferences form only ever submits
 * `{dateFormat, defaultTransactionView}`; setThemeAction only ever
 * submits `{theme}`). An overwrite would mean saving your date format
 * silently wipes your saved theme, and vice versa — whichever call
 * happened most recently would win, discarding the other. The Postgres
 * `||` jsonb concat operator merges top-level keys in a single atomic
 * UPDATE (no read-then-write race between two preference saves from the
 * same user, e.g. two browser tabs).
 */
export async function updatePreferences(userId: string, prefs: PreferenceBag) {
  const [row] = await db
    .update(users)
    .set({
      preferences: sql`coalesce(${users.preferences}, '{}'::jsonb) || ${JSON.stringify(prefs)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

// Wrapped in React's cache() — mirrors server/services/session.ts's
// verifySession(). This is now called from both (app)/layout.tsx (to
// resolve the account's saved theme) and individual pages like
// transactions/page.tsx (for date-format/view preferences) within the
// same request; without this, that's a second, needless DB round trip
// for identical data on every authenticated page load.
export const getUserById = cache(async (userId: string) => {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
});

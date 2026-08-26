import "server-only";
import { eq } from "drizzle-orm";
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

export async function updatePreferences(userId: string, prefs: PreferenceBag) {
  const [row] = await db
    .update(users)
    .set({ preferences: prefs, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

export async function getUserById(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

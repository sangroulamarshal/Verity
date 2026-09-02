import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { PREDEFINED_CATEGORIES, type CategoryType } from "@/lib/categories";
import { auditLogSafely } from "@/server/services/audit-log";

/**
 * Returns merged category names for a given type —
 * predefined defaults + custom org categories, deduped and sorted.
 */
export async function listCategories(
  organizationId: string,
  type?: "INCOME" | "EXPENSE"
): Promise<string[]> {
  const custom = await listCustomCategories(organizationId);

  const predefined = PREDEFINED_CATEGORIES
    .filter((c) => !type || c.type === type || c.type === "BOTH")
    .map((c) => c.name);

  const customNames = custom
    .filter((c) => !type || c.type === type || c.type === "BOTH")
    .map((c) => c.name);

  const merged = Array.from(new Set([...predefined, ...customNames]));
  return merged.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns raw custom category rows for the Manage Categories page.
 */
export async function listCustomCategories(
  organizationId: string
): Promise<(typeof categories.$inferSelect)[]> {
  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.organizationId, organizationId),
        eq(categories.isArchived, false)
      )
    )
    .orderBy(categories.name);
}

/**
 * Creates a new custom category for the org and audit logs it.
 */
export async function createCategory(
  organizationId: string,
  userId: string,
  email: string,
  data: { name: string; type: CategoryType }
): Promise<void> {
  const [created] = await db
    .insert(categories)
    .values({
      organizationId,
      name: data.name.trim(),
      type: data.type,
    })
    .returning();

  await auditLogSafely({
    organizationId,
    userId,
    userEmail: email,
    action: "CREATE",
    entityType: "category",
    entityId: created.id,
    newValues: { name: data.name, type: data.type },
  });
}

/**
 * Soft-deletes a custom category (sets is_archived = true) and audit logs it.
 */
export async function archiveCategory(
  organizationId: string,
  categoryId: string,
  userId: string,
  email: string
): Promise<void> {
  await db
    .update(categories)
    .set({ isArchived: true })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.organizationId, organizationId)
      )
    );

  await auditLogSafely({
    organizationId,
    userId,
    userEmail: email,
    action: "DELETE",
    entityType: "category",
    entityId: categoryId,
    newValues: { isArchived: true },
  });
}

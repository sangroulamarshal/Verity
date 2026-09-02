import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { PREDEFINED_CATEGORIES, type CategoryType } from "@/lib/categories";
import { auditLogSafely } from "@/server/services/audit-log";

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

export async function createCategory(
  organizationId: string,
  userId: string,
  _email: string,
  data: { name: string; type: CategoryType }
): Promise<void> {
  const [created] = await db
    .insert(categories)
    .values({ organizationId, name: data.name.trim(), type: data.type })
    .returning();

  await auditLogSafely({
    action: "TRANSACTION_CREATED",
    organizationId,
    userId,
    entityType: "category",
    entityId: created.id,
    metadata: { name: data.name, type: data.type },
  });
}

export async function archiveCategory(
  organizationId: string,
  categoryId: string,
  userId: string,
  _email: string
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
    action: "TRANSACTION_DELETED",
    organizationId,
    userId,
    entityType: "category",
    entityId: categoryId,
    metadata: { isArchived: true },
  });
}

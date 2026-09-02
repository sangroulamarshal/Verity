"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import { canWriteTransactions } from "@/lib/permissions";
import { createCategory, archiveCategory } from "@/server/services/categories";
import type { CategoryType } from "@/lib/categories";

export async function createCategoryAction(formData: FormData): Promise<{ error?: string }> {
  const session = await verifySession();
  if (!canWriteTransactions(session.role)) return { error: "Permission denied." };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as CategoryType;

  if (!name) return { error: "Category name is required." };
  if (!["INCOME", "EXPENSE", "BOTH"].includes(type)) return { error: "Invalid category type." };

  await createCategory(session.organizationId, session.userId, session.email, { name, type });
  revalidatePath("/transactions/categories");
  return {};
}

export async function archiveCategoryAction(categoryId: string): Promise<{ error?: string }> {
  const session = await verifySession();
  if (!canWriteTransactions(session.role)) return { error: "Permission denied." };

  await archiveCategory(session.organizationId, categoryId, session.userId, session.email);
  revalidatePath("/transactions/categories");
  return {};
}

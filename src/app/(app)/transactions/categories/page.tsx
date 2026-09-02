import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { listCustomCategories } from "@/server/services/categories";
import { PREDEFINED_CATEGORIES } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { ManageCategoriesClient } from "./manage-categories-client";

export const metadata: Metadata = { title: "Categories" };

const TYPE_VARIANTS = {
  INCOME: "income",
  EXPENSE: "expense",
  BOTH: "secondary",
} as const;

export default async function CategoriesPage() {
  const session = await verifySession();
  const customCategories = await listCustomCategories(session.organizationId);

  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4">
        <h1 className="text-[18px] font-semibold tracking-tight">Categories</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Manage transaction categories for your organisation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Built-in categories — read only */}
        <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[13px] font-medium">Built-in categories</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Provided by default — cannot be removed.</p>
          </div>
          <ul className="divide-y divide-border">
            {PREDEFINED_CATEGORIES.map((cat) => (
              <li key={cat.name} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <span>{cat.name}</span>
                <Badge variant={TYPE_VARIANTS[cat.type]}>{cat.type.charAt(0) + cat.type.slice(1).toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </div>

        {/* Custom categories */}
        <div className="rounded-[6px] border border-border bg-surface p-4">
          <ManageCategoriesClient
            customCategories={customCategories.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

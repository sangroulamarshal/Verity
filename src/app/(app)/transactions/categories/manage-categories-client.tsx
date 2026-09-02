"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createCategoryAction, archiveCategoryAction } from "./actions";
import type { CategoryType } from "@/lib/categories";

interface CustomCategory {
  id: string;
  name: string;
  type: CategoryType;
}

interface ManageCategoriesClientProps {
  customCategories: CustomCategory[];
}

const TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  BOTH: "Both",
};

const TYPE_VARIANTS: Record<CategoryType, "income" | "expense" | "secondary"> = {
  INCOME: "income",
  EXPENSE: "expense",
  BOTH: "secondary",
};

export function ManageCategoriesClient({ customCategories }: ManageCategoriesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<CustomCategory[]>(customCategories);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a category name."); return; }
    setError(null);

    const optimistic: CustomCategory = {
      id: `temp-${Date.now()}`,
      name: name.trim(),
      type,
    };
    setItems((prev) => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");

    const formData = new FormData();
    formData.set("name", optimistic.name);
    formData.set("type", type);

    startTransition(async () => {
      const result = await createCategoryAction(formData);
      if (result.error) {
        setError(result.error);
        setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      }
    });
  }

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await archiveCategoryAction(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Add form */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[14px] font-semibold">Add custom category</h2>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client Retainer"
              onKeyDown={(e) => e.key === "Enter" && handleAdd(e as any)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-type">Type</Label>
            <Select
              id="cat-type"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="BOTH">Both</option>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Adding…" : "Add category"}
          </Button>
        </form>

        {/* Custom list */}
        {items.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
              Your custom categories
            </p>
            {items.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-[13px]"
              >
                <span className="flex items-center gap-2">
                  {cat.name}
                  <Badge variant={TYPE_VARIANTS[cat.type]}>{TYPE_LABELS[cat.type]}</Badge>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(cat.id)}
                  disabled={isPending || cat.id.startsWith("temp-")}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  aria-label={`Remove ${cat.name}`}
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

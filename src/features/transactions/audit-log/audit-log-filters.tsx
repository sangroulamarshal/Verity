"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { value: "TRANSACTION_CREATED", label: "Created" },
  { value: "TRANSACTION_UPDATED", label: "Edited" },
  { value: "TRANSACTION_DELETED", label: "Deleted" },
];

export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams]
  );

  const hasFilters =
    searchParams.get("action") || searchParams.get("dateFrom") || searchParams.get("dateTo");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
      <Select
        aria-label="Filter by action"
        className="w-auto"
        defaultValue={searchParams.get("action") ?? ""}
        onChange={(event) => updateParam("action", event.target.value)}
      >
        <option value="">All actions</option>
        {ACTIONS.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
      </Select>

      <Input
        type="date"
        aria-label="From date"
        className="w-auto"
        defaultValue={searchParams.get("dateFrom") ?? ""}
        onChange={(event) => updateParam("dateFrom", event.target.value)}
      />
      <Input
        type="date"
        aria-label="To date"
        className="w-auto"
        defaultValue={searchParams.get("dateTo") ?? ""}
        onChange={(event) => updateParam("dateTo", event.target.value)}
      />

      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear
        </Button>
      )}
    </div>
  );
}

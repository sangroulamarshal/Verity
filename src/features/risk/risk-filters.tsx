"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function RiskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <form
        className="flex-1 sm:max-w-sm"
        onSubmit={(event) => {
          event.preventDefault();
          updateParam("search", search);
        }}
      >
        <Input
          type="search"
          placeholder="Search description, category, vendor, reference…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onBlur={() => updateParam("search", search)}
          aria-label="Search flagged transactions"
        />
      </form>

      <div className="flex gap-2">
        <Select
          value={searchParams.get("level") ?? ""}
          onChange={(event) => updateParam("level", event.target.value)}
          aria-label="Filter by risk level"
        >
          <option value="">All levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </Select>
        <Select
          value={searchParams.get("status") ?? ""}
          onChange={(event) => updateParam("status", event.target.value)}
          aria-label="Filter by review status"
        >
          <option value="">All statuses</option>
          <option value="UNREVIEWED">Needs review</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
        </Select>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

export function CustomerSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    // Same reasoning as transaction-filters.tsx: a stale page number
    // for a narrower search could point past the end of the results.
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      className="max-w-sm flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        updateSearch(search);
      }}
    >
      <Input
        type="search"
        placeholder="Search name, email, phone…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onBlur={() => updateSearch(search)}
        aria-label="Search customers"
      />
    </form>
  );
}

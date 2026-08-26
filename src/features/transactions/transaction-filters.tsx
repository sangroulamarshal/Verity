"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TRANSACTION_CURRENCIES } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "./schema";

/**
 * Search and filters compose together via URL search params (brief
 * section 13: "search and filtering must work together") rather than
 * separate client state — that also means a filtered/searched URL is
 * shareable and survives a refresh, and `page` is dropped whenever a
 * filter changes so a stale page number never produces an empty result.
 */
export function TransactionFilters() {
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
          aria-label="Search transactions"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by currency"
          className="w-auto"
          defaultValue={searchParams.get("currency") ?? ""}
          onChange={(event) => updateParam("currency", event.target.value)}
        >
          <option value="">All currencies</option>
          {TRANSACTION_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by payment method"
          className="w-auto"
          defaultValue={searchParams.get("paymentMethod") ?? ""}
          onChange={(event) => updateParam("paymentMethod", event.target.value)}
        >
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
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

        {(searchParams.get("currency") ||
          searchParams.get("paymentMethod") ||
          searchParams.get("dateFrom") ||
          searchParams.get("dateTo") ||
          searchParams.get("search")) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              startTransition(() => router.push(pathname));
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

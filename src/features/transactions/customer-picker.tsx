"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchCustomersForTransactionAction } from "./customer-search-action";
import type { CustomerPickerResult } from "@/server/services/customers";

interface CustomerPickerProps {
  defaultCounterparty?: string;
  defaultCustomerId?: string;
  error?: string;
}

/**
 * Replaces the plain counterparty text <Input> with a searchable
 * combobox over the organization's saved customers, while keeping the
 * exact same submitted shape the server already expects: a
 * `counterparty` text field (still freely editable, still valid on its
 * own with no customer linked) plus a hidden `customerId`, populated
 * only when a suggestion is actually selected — never inferred from
 * text alone, so "type a name that happens to match" doesn't silently
 * link to that customer without the person choosing it.
 *
 * docs/ARCHITECTURE.md's Phase 3 notes flagged a plain native <select>
 * as insufficient here ("worth revisiting once Phase 5's customer
 * picker needs a searchable list") — this is that revisit. No new
 * dependency: Radix's primitives are built for click-triggered menus,
 * not a text-input-driven listbox, so this is hand-rolled the same way
 * ExchangeRatePreview (features/transactions/exchange-rate-preview.tsx)
 * hand-rolls its own debounced live lookup rather than reaching for a
 * heavier library.
 */
export function CustomerPicker({
  defaultCounterparty,
  defaultCustomerId,
  error,
}: CustomerPickerProps) {
  const [text, setText] = useState(defaultCounterparty ?? "");
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [results, setResults] = useState<{ query: string; matches: CustomerPickerResult[] }>({
    query: "",
    matches: [],
  });
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = text.trim();
    if (!term) {
      // No setState needed here: `matches` below is derived from
      // `results.query === text.trim()`, and an empty term can never
      // equal a previously-fetched non-empty query, so the list already
      // renders empty without clearing state from inside the effect.
      return;
    }

    const handle = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchCustomersForTransactionAction(term);
        setResults({ query: term, matches });
      });
    }, 300);

    return () => clearTimeout(handle);
  }, [text]);

  // Close the dropdown on an outside click — a plain text input has no
  // built-in "commit" moment the way a native <select> does, so without
  // this the list would stay open until something else stole focus.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const matches = results.query === text.trim() ? results.matches : [];
  const showList = isOpen && matches.length > 0;

  function selectCustomer(customer: CustomerPickerResult) {
    setText(customer.name);
    setCustomerId(customer.id);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <Label htmlFor="counterparty">
        Customer/Vendor <span className="text-muted-foreground">(optional)</span>
      </Label>
      <div className="relative">
        <input type="hidden" name="customerId" value={customerId} />
        <Input
          id="counterparty"
          name="counterparty"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls="customer-picker-listbox"
          aria-invalid={!!error}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            // Any manual edit invalidates a prior selection — typing
            // "Acme Ltd Ltd" after picking "Acme Ltd" must not keep
            // pointing at that customer record.
            setCustomerId("");
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (!showList) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((index) => Math.min(index + 1, matches.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && highlightedIndex >= 0) {
              event.preventDefault();
              selectCustomer(matches[highlightedIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
        />
        {showList && (
          <ul
            id="customer-picker-listbox"
            role="listbox"
            className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {matches.map((customer, index) => (
              <li key={customer.id} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                    index === highlightedIndex ? "bg-accent text-accent-foreground" : ""
                  }`}
                  // onMouseDown (not onClick) fires before the input's
                  // onBlur/outside-click handling can close the list
                  // first and discard the selection.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectCustomer(customer);
                  }}
                >
                  {customer.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Start typing to find a saved customer, or enter a name freely.
      </p>
    </div>
  );
}

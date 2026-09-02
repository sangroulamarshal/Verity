"use client";

import { useState, useRef, useEffect } from "react";

interface CategoryPickerProps {
  name?: string;
  value?: string;
  categories: string[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function CategoryPicker({
  name = "category",
  value = "",
  categories,
  placeholder = "Select or type a category…",
  onChange,
}: CategoryPickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? categories.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : categories;

  const showEscape = query.trim() && !categories.some(
    (c) => c.toLowerCase() === query.trim().toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(val: string) {
    setQuery(val);
    setOpen(false);
    onChange?.(val);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[0]) select(filtered[0]);
      else if (showEscape) select(query.trim());
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input type="hidden" name={name} value={query} />
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[13px] shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange?.(e.target.value); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (filtered.length > 0 || showEscape) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((cat) => (
              <li
                key={cat}
                className="cursor-pointer px-3 py-1.5 text-[13px] hover:bg-elevated transition-colors"
                onMouseDown={(e) => { e.preventDefault(); select(cat); }}
              >
                {cat}
              </li>
            ))}
            {showEscape && (
              <li
                className="cursor-pointer px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-elevated transition-colors border-t border-border"
                onMouseDown={(e) => { e.preventDefault(); select(query.trim()); }}
              >
                Use &ldquo;{query.trim()}&rdquo;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface CategoryPickerFieldProps {
  name?: string;
  defaultValue?: string;
  categories: string[];
  placeholder?: string;
}

export function CategoryPickerField({
  name = "category",
  defaultValue = "",
  categories,
  placeholder,
}: CategoryPickerFieldProps) {
  return (
    <div style={{ position: "relative" }}>
      <CategoryPicker
        name={name}
        value={defaultValue}
        categories={categories}
        placeholder={placeholder}
      />
    </div>
  );
}

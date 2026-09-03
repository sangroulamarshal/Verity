"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, X } from "lucide-react";

interface SearchResult {
  type: "transaction" | "customer";
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

async function runSearch(query: string): Promise<SearchResponse> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return { results: [] };
  return res.json();
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const { results: r } = await runSearch(query);
        setResults(r);
        setActiveIndex(0);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[activeIndex]) navigate(results[activeIndex].href);
  }

  if (!open) return null;

  const transactions = results.filter((r) => r.type === "transaction");
  const customers    = results.filter((r) => r.type === "customer");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-[560px] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground/50" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search transactions, customers..."
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/40"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/40">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {!query.trim() && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground/50">
              Type to search across transactions and customers
            </p>
          )}

          {query.trim() && !isPending && results.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground/50">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {isPending && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground/50">Searching…</p>
          )}

          {!isPending && transactions.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                Transactions
              </p>
              {transactions.map((r) => {
                const globalIndex = results.indexOf(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(r.href)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      globalIndex === activeIndex ? "bg-elevated" : "hover:bg-elevated/60"
                    }`}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileText className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{r.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.sublabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!isPending && customers.length > 0 && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                Customers
              </p>
              {customers.map((r) => {
                const globalIndex = results.indexOf(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(r.href)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      globalIndex === activeIndex ? "bg-elevated" : "hover:bg-elevated/60"
                    }`}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Users className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{r.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.sublabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground/40">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

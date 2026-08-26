"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
  isActive: (pathname: string, type: string | null) => boolean;
}

const TABS: Tab[] = [
  {
    label: "All",
    href: "/transactions",
    isActive: (pathname, type) => pathname === "/transactions" && !type,
  },
  {
    label: "Income",
    href: "/transactions?type=INCOME",
    isActive: (pathname, type) => pathname === "/transactions" && type === "INCOME",
  },
  {
    label: "Expenses",
    href: "/transactions?type=EXPENSE",
    isActive: (pathname, type) => pathname === "/transactions" && type === "EXPENSE",
  },
  {
    label: "Presets",
    href: "/transactions/presets",
    isActive: (pathname) => pathname.startsWith("/transactions/presets"),
  },
  {
    label: "Audit Log",
    href: "/transactions/audit-log",
    isActive: (pathname) => pathname.startsWith("/transactions/audit-log"),
  },
];

export function TransactionTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  return (
    <div className="flex gap-1 border-b border-border px-4">
      {TABS.map((tab) => {
        const active = tab.isActive(pathname, type);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

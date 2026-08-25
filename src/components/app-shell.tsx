"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Only routes that exist today. Risk / Cash Flow / Customers are not in
// this list on purpose — they don't have pages yet (see README phase
// table), and a nav item that 404s is worse than no nav item.
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/imports", label: "Imports", icon: Upload },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-3">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
        V
      </span>
      <span className="text-sm font-semibold tracking-tight">Verity</span>
    </Link>
  );
}

interface AppShellProps {
  orgName: string;
  email: string;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}

export function AppShell({ orgName, email, logoutAction, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-card py-4 md:flex">
        <div className="mb-6">
          <Brand />
        </div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto px-3 pt-4">
          <div className="rounded-md border border-border bg-secondary/50 px-2.5 py-2">
            <p className="truncate text-xs font-medium text-foreground">{orgName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
      </aside>

      {/* Mobile off-canvas nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-border bg-card py-4">
            <div className="mb-6 flex items-center justify-between px-3">
              <Brand />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              >
                <X />
              </Button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            <div className="mt-auto px-3 pt-4">
              <div className="rounded-md border border-border bg-secondary/50 px-2.5 py-2">
                <p className="truncate text-xs font-medium text-foreground">{orgName}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu />
          </Button>

          <div className="flex-1" />

          <ThemeToggle />
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

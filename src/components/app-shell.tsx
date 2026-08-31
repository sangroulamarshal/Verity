"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Upload,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencySelector } from "@/components/currency-selector";
import { UserMenu } from "@/components/user-menu";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

// Only routes that exist today. Risk / Cash Flow have no section here
// on purpose — they don't have pages yet (see README phase table), and
// a nav item that 404s, or worse, opens a page full of invented
// numbers, is worse than no nav item at all. Customers (Phase 5) moved
// out of that list once its pages actually shipped.
const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Business",
    items: [
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  { label: "Data", items: [{ href: "/imports", label: "Imports", icon: Upload }] },
  { label: "System", items: [{ href: "/settings/account", label: "Settings", icon: SettingsIcon }] },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-4 px-3">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md py-2 pl-3.5 pr-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {/* Thin active indicator — never relies on text color alone
                    (brief section 4). */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
        V
      </span>
      <span className="text-base font-semibold tracking-tight">Verity</span>
    </Link>
  );
}

function OrgBox({ orgName, role }: { orgName: string; role: UserRole }) {
  return (
    <div className="rounded-md border border-border bg-secondary/50 px-2.5 py-2">
      <p className="truncate text-xs font-medium text-foreground">{orgName}</p>
      <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
    </div>
  );
}

interface AppShellProps {
  orgName: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  displayCurrency: string;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}

export function AppShell({
  orgName,
  email,
  fullName,
  role,
  displayCurrency,
  logoutAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar — bg-sidebar, a distinct surface from bg-card so
          the sidebar reads as its own plane rather than blending into the
          cards sitting in the main column (brief section 7). */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar py-5 text-sidebar-foreground md:flex">
        <div className="mb-7">
          <Brand />
        </div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto px-3 pt-4">
          <OrgBox orgName={orgName} role={role} />
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
          <aside className="relative flex h-full w-64 flex-col border-r border-border bg-sidebar py-5 text-sidebar-foreground">
            <div className="mb-7 flex items-center justify-between px-3">
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
              <OrgBox orgName={orgName} role={role} />
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:px-6">
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

          <CurrencySelector value={displayCurrency} />
          <ThemeToggle />
          <UserMenu email={email} fullName={fullName} role={role} logoutAction={logoutAction} />
        </header>

        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}

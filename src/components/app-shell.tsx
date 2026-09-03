"use client";


import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  LayoutList,
  Upload,
  GitMerge,
  ClipboardList,
  ShieldAlert,
  TrendingUp,
  Lightbulb,
  BarChart,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronDown,
  Search,
  HelpCircle,
  Tag,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search-modal";
import { NotificationsPanel, type NotificationItem } from "@/components/notifications-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencySelector } from "@/components/currency-selector";
import { UserMenu } from "@/components/user-menu";
import type { UserRole } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  label: string | null;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "Transactions",
    collapsible: true,
    items: [
      { href: "/transactions/all", label: "All Transactions", icon: LayoutList },
      { href: "/transactions/income", label: "Income", icon: ArrowUp },
      { href: "/transactions/expenses", label: "Expenses", icon: ArrowDown },
      { href: "/transactions/presets", label: "Presets", icon: ArrowLeftRight },
      { href: "/imports", label: "Imports", icon: Upload },
      { href: "/transactions/reconciliation", label: "Reconciliation", icon: GitMerge },
      { href: "/transactions/audit-log", label: "Audit Log", icon: ClipboardList },
      { href: "/transactions/categories", label: "Categories", icon: Tag },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/risk", label: "Risk", icon: ShieldAlert },
      { href: "/cashflow", label: "Cash Flow Forecast", icon: TrendingUp },
      { href: "/insights", label: "Insights", icon: Lightbulb },
    ],
  },
  {
    label: "Reporting",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings/account", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const LIVE_ROUTES = new Set([
  "/dashboard",
  "/customers",
  "/invoices",
  "/transactions",
  "/transactions/all",
  "/transactions/income",
  "/transactions/expenses",
  "/transactions/presets",
  "/transactions/audit-log",
  "/transactions/categories",
  "/transactions/reconciliation",
  "/imports",
  "/risk",
  "/cashflow",
  "/insights",
  "/reports",
  "/settings",
  "/settings/account",
  "/settings/organization",
  "/settings/members",
  "/settings/security",
  "/settings/notifications",
  "/settings/preferences",
]);

function routeIsLive(href: string): boolean {
  if (LIVE_ROUTES.has(href)) return true;
  for (const live of LIVE_ROUTES) {
    if (href.startsWith(live + "/")) return true;
  }
  return false;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const live = routeIsLive(item.href);

  if (!live) {
    return (
      <span className="group flex items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2.5 text-[13px] text-muted-foreground/35 cursor-default select-none">
        <Icon className="size-[14px] shrink-0 opacity-30" />
        {item.label}
        <span className="ml-auto text-[10px] text-muted-foreground/25 font-mono">soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2.5 text-[13px] transition-colors duration-150",
        active
          ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
          : "text-muted-foreground hover:bg-elevated hover:text-foreground"
      )}
    >

      <Icon
        className={cn(
          "size-[14px] shrink-0 transition-colors duration-150",
          active ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"
        )}
      />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarNavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActive = group.items.some((i) => isActive(pathname, i.href));
  const [collapsed, setCollapsed] = React.useState(
    group.defaultCollapsed ?? false
  );

  const showItems = !group.collapsible || !collapsed || hasActive;

  return (
    <div className="flex flex-col">
      {group.label && (
        <div className="px-3 pt-4 pb-1">
          {group.collapsible ? (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
            >
              {group.label}
              <ChevronDown
                className={cn(
                  "size-3 transition-transform duration-200",
                  collapsed && !hasActive ? "-rotate-90" : ""
                )}
              />
            </button>
          ) : (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
              {group.label}
            </p>
          )}
        </div>
      )}
      {showItems && (
        <div className="flex flex-col gap-0.5 px-2">
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={26} height={26} className="size-[26px] shrink-0" />
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        VERITY
      </span>
    </Link>
  );
}

function WorkspaceBox({ orgName }: { orgName: string }) {
  return (
    <div className="mx-3 mt-3 rounded-md border border-border bg-elevated/60 px-2.5 py-2">
      <p className="truncate text-[12px] font-medium text-foreground/90">{orgName}</p>
    </div>
  );
}


interface AppShellProps {
  notifications?: NotificationItem[];
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
  notifications = [],
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <WorkspaceBox orgName={orgName} />
      <div className="flex-1 overflow-y-auto scrollbar-thin mt-1">
        {NAV_GROUPS.map((group, i) => (
          <SidebarNavGroup
            key={group.label ?? `g${i}`}
            group={group}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
        <div className="h-4" />
      </div>
      <div className="border-t border-sidebar-border px-3 py-3">
        <Link
          href="/settings/account"
          onClick={onNavigate}
          className="flex items-center gap-2 text-[12px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          <HelpCircle className="size-3.5" />
          Help &amp; Support
        </Link>
      </div>
      <div className="border-t border-sidebar-border px-3 py-2.5">
        <UserMenu email={email} fullName={fullName} role={role} logoutAction={logoutAction} sidebar />
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-[52px] shrink-0 items-center border-b border-sidebar-border">
          <Brand />
        </div>
        {sidebarContent()}
      </aside>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-sidebar-border pr-2">
              <Brand />
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            {sidebarContent(() => setMobileNavOpen(false))}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
          <button
            type="button"
            aria-label="Open navigation"
            className="mr-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-4" />
          </button>

          <SearchModal />{/* Search */}
          <div className="hidden flex-1 sm:flex sm:max-w-[480px]">
            <div onClick={() => { const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }); document.dispatchEvent(e); }}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-elevated/40 px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-elevated/60 cursor-text transition-colors">
              <Search className="size-3.5 shrink-0 text-muted-foreground/40" />
              <span className="flex-1 text-[12px] text-muted-foreground/40">
                Search transactions, customers, invoices...
              </span>
              <kbd className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/30">
                {"\u2318"}K
              </kbd>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <NotificationsPanel notifications={notifications} />

            <div className="mx-1 h-5 w-px bg-border" />
            <CurrencySelector value={displayCurrency} />
            <ThemeToggle />
            <div className="mx-1 h-5 w-px bg-border" />
            <UserMenu email={email} fullName={fullName} role={role} logoutAction={logoutAction} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}



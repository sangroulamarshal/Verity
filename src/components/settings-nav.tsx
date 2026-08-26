"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/permissions";
import { canManageOrganization, canManageMembers } from "@/lib/permissions";

interface SettingsNavProps {
  role: UserRole;
}

export function SettingsNav({ role }: SettingsNavProps) {
  const pathname = usePathname();

  const items = [
    { href: "/settings/account", label: "Account", show: true },
    { href: "/settings/organization", label: "Organization", show: canManageOrganization(role) },
    { href: "/settings/members", label: "Members", show: canManageMembers(role) },
    { href: "/settings/security", label: "Security", show: true },
    { href: "/settings/notifications", label: "Notifications", show: true },
    { href: "/settings/preferences", label: "Preferences", show: true },
  ].filter((item) => item.show);

  return (
    <nav className="flex flex-col gap-0.5 sm:w-48 sm:shrink-0">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

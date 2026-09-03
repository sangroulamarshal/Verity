"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Users, Shield, Bell, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/permissions";
import { canManageOrganization, canManageMembers } from "@/lib/permissions";

interface SettingsNavProps { role: UserRole; }

const NAV_ITEMS = [
  { href: "/settings/account",       label: "Profile",       icon: User,      guard: () => true },
  { href: "/settings/organization",  label: "Organisation",  icon: Building2, guard: canManageOrganization },
  { href: "/settings/members",       label: "Members",       icon: Users,     guard: canManageMembers },
  { href: "/settings/security",      label: "Security",      icon: Shield,    guard: () => true },
  { href: "/settings/notifications", label: "Notifications", icon: Bell,      guard: () => true },
  { href: "/settings/preferences",   label: "Preferences",   icon: Sliders,   guard: () => true },
];

export function SettingsNav({ role }: SettingsNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.guard(role));

  return (
    <nav aria-label="Settings" className="flex flex-row flex-wrap gap-1 sm:w-44 sm:shrink-0 sm:flex-col sm:flex-nowrap sm:gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors duration-150",
              active
                ? "bg-elevated text-foreground font-medium"
                : "text-muted-foreground hover:bg-elevated hover:text-foreground"
            )}
          >
            <Icon className={cn("size-[14px] shrink-0", active ? "text-foreground/70" : "text-muted-foreground/50 group-hover:text-muted-foreground")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

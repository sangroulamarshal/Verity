"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions";

interface UserMenuProps {
  email: string;
  fullName: string | null;
  role: UserRole;
  logoutAction: () => void | Promise<void>;
  /** When true, renders as a compact sidebar footer row instead of icon-only trigger */
  sidebar?: boolean;
}

function initialsFor(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "").concat(parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "").toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ email, fullName, role, logoutAction, sidebar }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {sidebar ? (
          <button
            type="button"
            aria-label="Account menu"
            className="flex w-full items-center gap-2.5 rounded-md px-0 py-1 text-left hover:bg-elevated transition-colors"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
              {initialsFor(fullName, email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-foreground/90">{fullName || email}</p>
              <p className="truncate text-[11px] text-muted-foreground/60">{ROLE_LABELS[role]}</p>
            </div>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground/40" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/30"
          >
            {initialsFor(fullName, email)}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{fullName || email}</span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
          <span className="mt-1 inline-flex w-fit items-center rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
            {ROLE_LABELS[role]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <Settings className="mr-2 size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="mr-2 size-4" />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

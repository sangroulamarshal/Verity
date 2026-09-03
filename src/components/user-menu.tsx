"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions";

interface UserMenuProps {
  email: string;
  fullName: string | null;
  role: UserRole;
  logoutAction: () => void | Promise<void>;
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
          <button type="button" aria-label="Account menu" className="flex w-full items-center gap-2.5 rounded-md px-0 py-1 text-left transition-colors hover:bg-sidebar-foreground/[0.06]">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-active/25 text-[11px] font-semibold text-sidebar-active-foreground">
              {initialsFor(fullName, email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-sidebar-foreground/85">{fullName || email}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/40">{ROLE_LABELS[role]}</p>
            </div>
            <ChevronDown className="size-3 shrink-0 text-sidebar-foreground/30" />
          </button>
        ) : (
          <button type="button" aria-label="Account menu" className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25">
            {initialsFor(fullName, email)}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="truncate text-[13px] font-medium text-foreground">{fullName || email}</span>
          <span className="block truncate text-[12px] text-muted-foreground">{email}</span>
          <span className="mt-1 inline-flex w-fit items-center rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{ROLE_LABELS[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account" className="flex items-center gap-2 cursor-pointer">
            <Settings className="size-3.5 text-muted-foreground" />Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logoutAction()} className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="size-3.5" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

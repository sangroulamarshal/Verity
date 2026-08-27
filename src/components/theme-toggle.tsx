"use client";

import * as React from "react";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountTheme } from "@/components/use-account-theme";

export function ThemeToggle() {
  // setTheme here also persists to the account (see use-account-theme.ts)
  // — previously this only ever called next-themes' own setTheme(),
  // which is why the theme reverted whenever local storage/cache was
  // cleared or on a different browser: it was never actually saved.
  const { setTheme } = useAccountTheme();
  // No JS "mounted" state needed: the server and client render identical
  // markup, and the icon swap is driven purely by the `.dark` class that
  // next-themes puts on <html> (see globals.css `@custom-variant dark`).
  // That's what avoids both the hydration mismatch and the
  // setState-in-effect anti-pattern the old version had.

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Toggle theme"
          className="gap-1 px-2.5"
        >
          <span className="relative size-4">
            <Sun className="absolute inset-0 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute inset-0 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

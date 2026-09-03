"use client";

import * as React from "react";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountTheme } from "@/components/use-account-theme";

const OPTIONS = [
  { value: "light",  label: "Light",  Icon: Sun },
  { value: "dark",   label: "Dark",   Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useAccountTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Toggle theme"
          className="flex h-8 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
        >
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 absolute" />
          <Moon className="size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 absolute" />
          <span className="sr-only">Toggle theme</span>
          <ChevronDown className="size-3 shrink-0 opacity-50 ml-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className={active ? "text-primary font-medium" : ""}
            >
              <Icon className="mr-2 size-4" />
              {label}
              {active && <span className="ml-auto pl-4 text-primary">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

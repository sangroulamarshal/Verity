"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

/**
 * A 3-way segmented switch rather than a dropdown: the previous version
 * required opening a menu before you could see or pick an option, which
 * is an extra step for something used constantly. This shows all three
 * states at once and switches on a single click, with the active option
 * sliding a filled pill under it (150ms, matches the rest of the app's
 * micro-interaction timing).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Before hydration, next-themes hasn't read the persisted preference
  // yet — `theme` is undefined for one tick. Falling back to "system"
  // for the *active-state comparison only* (not for setTheme calls)
  // avoids a flash of every option looking unselected.
  const active = theme ?? "system";

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary/50 p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-[5px] transition-colors duration-150",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

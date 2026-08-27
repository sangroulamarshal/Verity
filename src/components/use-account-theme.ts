"use client";

import { useCallback, useTransition } from "react";
import { useTheme } from "next-themes";
import { setThemeAction } from "@/features/settings/preferences/actions";
import type { Theme } from "@/features/settings/preferences/schema";

/**
 * Wraps next-themes' setTheme() so every place in the app that lets
 * someone pick a theme (the header ThemeToggle, Settings > Preferences'
 * AppearanceControl) does both halves of the job: apply it instantly in
 * this browser (next-themes' own job, via localStorage) AND persist it
 * to the account (setThemeAction, via the DB) so it survives a cleared
 * cache or a different browser/device. Previously only the first half
 * happened anywhere in the app.
 */
export function useAccountTheme() {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const setAccountTheme = useCallback(
    (next: Theme) => {
      setTheme(next);
      startTransition(async () => {
        await setThemeAction(next);
      });
    },
    [setTheme]
  );

  return { theme, setTheme: setAccountTheme, isPending };
}

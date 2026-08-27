"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { Theme } from "@/features/settings/preferences/schema";

/**
 * Renders nothing — its only job is to make the account's saved theme
 * (resolved server-side in (app)/layout.tsx, from users.preferences)
 * the source of truth in this browser too.
 *
 * Without this, theme was ONLY ever stored in next-themes' own
 * localStorage: clear local storage/cache, open a private window, or
 * sign in on a different browser, and the app has no idea what this
 * account's theme actually is — it falls back to "system" every time,
 * which reads as the preference having been silently lost. This runs
 * once per mount (i.e. once per hard navigation/session, since
 * (app)/layout.tsx persists across client-side navigations within the
 * route group) and applies the server-known value whenever it differs
 * from whatever this browser currently has.
 *
 * Deliberately one-directional (DB -> browser) and only overwrites
 * local state when a mismatch is detected — it does not fight a person
 * actively changing the selector, since that path (useAccountTheme)
 * already writes the DB first via setThemeAction.
 */
export function ThemeSync({ theme }: { theme: Theme }) {
  const { theme: current, setTheme } = useTheme();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    if (current !== theme) setTheme(theme);
  }, [current, theme, setTheme]);

  return null;
}

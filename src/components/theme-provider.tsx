"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wraps next-themes so the rest of the app never imports it directly.
 * Class-based strategy (adds/removes `.dark` on <html>) to match the
 * `.dark` selector used in globals.css.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

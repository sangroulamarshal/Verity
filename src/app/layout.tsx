import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// IBM Plex Sans/Mono, self-hosted via @fontsource (font files ship
// inside the npm package itself — no build- or run-time request to
// Google Fonts or any other external host, same "no external network
// dependency" property the previous Geist setup had). Chosen over a
// generic geometric sans for its actual brand fit: IBM Plex reads as
// deliberately institutional/financial rather than "generic AI SaaS
// template" — see globals.css's design-tokens comment for the full
// reasoning behind this pass's color + type choices.

export const metadata: Metadata = {
  title: "Verity",
  description:
    "Verity turns messy business financial data into a clear view of customers, transactions, anomalies, and cash flow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        // Browser extensions (Grammarly, password managers, etc.) commonly
        // inject attributes onto <body> before React hydrates — a real
        // hydration mismatch React can't distinguish from a bug in this
        // app, but isn't one. suppressHydrationWarning here only silences
        // that specific class of warning for this one element; it does
        // not suppress mismatches in this element's children.
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex flex-1 flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

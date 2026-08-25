import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Self-hosted font files (no build-time fetch to Google Fonts) — one less
// external network dependency for both this build and CI.

export const metadata: Metadata = {
  title: "Verity — Financial clarity you can trust.",
  description:
    "Verity turns messy business financial data into a clear view of customers, transactions, anomalies, and cash flow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
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

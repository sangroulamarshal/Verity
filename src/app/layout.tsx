import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header";
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

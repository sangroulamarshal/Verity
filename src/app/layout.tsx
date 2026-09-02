import type { Metadata, Viewport } from "next";
// Inter variable font -- self-hosted via @fontsource-variable/inter.
// Font files ship inside the npm package; zero external network calls
// at build or runtime. Inter is used for all UI text -- clean modern
// geometric sans that matches the sidebar screenshot reference closely.
import "@fontsource-variable/inter";
// IBM Plex Mono kept for financial values, transaction IDs, currency
// codes, and reference numbers -- monospaced tabular figures.
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Verity",
  description:
    "Verity turns messy business financial data into a clear view of customers, transactions, anomalies, and cash flow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
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

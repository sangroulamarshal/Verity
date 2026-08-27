import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, users } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { logoutAction } from "@/features/auth/actions";
import { AppShell } from "@/components/app-shell";
import { ThemeSync } from "@/components/theme-sync";
import { themeSchema, DEFAULT_THEME } from "@/features/settings/preferences/schema";

// Route groups don't get an entry in Next's generated LayoutProps map, so
// this takes a plain children prop rather than LayoutProps<...>.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  const [[org], [user]] = await Promise.all([
    db
      .select({ name: organizations.name, baseCurrency: organizations.baseCurrency })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1),
    db
      .select({ fullName: users.fullName, preferences: users.preferences })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1),
  ]);

  // users.preferences is a loosely-typed jsonb blob (see PreferenceBag in
  // server/services/account.ts) — validated here rather than trusted,
  // same reasoning as every other stored-JSON read in this codebase.
  const parsedTheme = themeSchema.safeParse(
    user?.preferences && typeof user.preferences === "object"
      ? (user.preferences as Record<string, unknown>).theme
      : undefined
  );
  const theme = parsedTheme.success ? parsedTheme.data : DEFAULT_THEME;

  return (
    <>
      <ThemeSync theme={theme} />
      <AppShell
        orgName={org?.name ?? "Organization"}
        email={session.email}
        fullName={user?.fullName ?? null}
        role={session.role}
        displayCurrency={session.displayCurrency ?? org?.baseCurrency ?? "GBP"}
        logoutAction={logoutAction}
      >
        {children}
      </AppShell>
    </>
  );
}

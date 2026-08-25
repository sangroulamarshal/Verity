import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { logoutAction } from "@/features/auth/actions";
import { AppShell } from "@/components/app-shell";

// Route groups don't get an entry in Next's generated LayoutProps map, so
// this takes a plain children prop rather than LayoutProps<...>.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  return (
    <AppShell orgName={org?.name ?? "Organization"} email={session.email} logoutAction={logoutAction}>
      {children}
    </AppShell>
  );
}

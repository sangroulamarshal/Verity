import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema";
import { verifySession } from "@/server/services/session";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard — Verity",
};

// Minimal placeholder proving the protected-route boundary works end to
// end (proxy optimistic redirect + verifySession authoritative DB check).
// The real dashboard — financial health, cash-flow chart, risk summary,
// recent transactions — is built in Phase 8, once those data sources
// exist.
export default async function DashboardPage() {
  const session = await verifySession();

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re signed in</CardTitle>
          <CardDescription>
            {session.email} · {org?.name ?? "Unknown organization"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This is a placeholder confirming the authentication boundary
            works — real dashboard content (financial health, cash flow,
            risk summary, recent transactions) arrives in Phase 8.
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

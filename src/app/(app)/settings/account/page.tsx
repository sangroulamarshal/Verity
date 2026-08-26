import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { getUserById } from "@/server/services/account";
import { getOrganization } from "@/server/services/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/features/settings/account/account-form";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountSettingsPage() {
  const session = await verifySession();
  const [user, organization] = await Promise.all([
    getUserById(session.userId),
    getOrganization(session.organizationId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <AccountForm
          email={session.email}
          fullName={user?.fullName ?? null}
          phone={user?.phone ?? null}
          timezone={user?.timezone ?? null}
          displayCurrency={user?.displayCurrency ?? null}
          organizationBaseCurrency={organization?.baseCurrency ?? "GBP"}
        />
      </CardContent>
    </Card>
  );
}

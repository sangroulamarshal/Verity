import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { getOrganization } from "@/server/services/organizations";
import { canManageOrganization } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationForm } from "@/features/settings/organization/organization-form";

export const metadata: Metadata = {
  title: "Organization",
};

export default async function OrganizationSettingsPage() {
  const session = await verifySession();
  if (!canManageOrganization(session.role)) {
    redirect("/settings/account");
  }

  const organization = await getOrganization(session.organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <OrganizationForm
          name={organization?.name ?? ""}
          industry={organization?.industry ?? null}
          country={organization?.country ?? null}
          baseCurrency={organization?.baseCurrency ?? "GBP"}
          timezone={organization?.timezone ?? "UTC"}
        />
      </CardContent>
    </Card>
  );
}

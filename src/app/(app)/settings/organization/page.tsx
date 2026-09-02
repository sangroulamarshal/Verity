import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { getOrganization } from "@/server/services/organizations";
import { canManageOrganization } from "@/lib/permissions";
import { OrganizationForm } from "@/features/settings/organization/organization-form";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationSettingsPage() {
  const session = await verifySession();
  if (!canManageOrganization(session.role)) redirect("/settings/account");

  const organization = await getOrganization(session.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-medium">Organization</p>
          <p className="text-[12px] text-muted-foreground">Name, region, and base currency for this workspace.</p>
        </div>
        <div className="px-5 py-4">
          <OrganizationForm
            name={organization?.name ?? ""}
            industry={organization?.industry ?? null}
            country={organization?.country ?? null}
            baseCurrency={organization?.baseCurrency ?? "GBP"}
            timezone={organization?.timezone ?? "UTC"}
          />
        </div>
      </div>
    </div>
  );
}

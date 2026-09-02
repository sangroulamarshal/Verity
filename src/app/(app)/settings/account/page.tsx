import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { getUserById } from "@/server/services/account";
import { getOrganization } from "@/server/services/organizations";
import { ROLE_LABELS } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { AccountForm } from "@/features/settings/account/account-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountSettingsPage() {
  const session = await verifySession();
  const [user, organization] = await Promise.all([
    getUserById(session.userId),
    getOrganization(session.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* Profile card */}
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-medium">Profile</p>
          <p className="text-[12px] text-muted-foreground">Your name and contact information.</p>
        </div>
        <div className="px-5 py-4">
          {/* Avatar + role badge row */}
          <div className="mb-4 flex items-center gap-3">
            <Avatar
              name={user?.fullName}
              email={session.email}
              size="lg"
            />
            <div>
              <p className="text-[14px] font-semibold">{user?.fullName || session.email}</p>
              <p className="text-[12px] text-muted-foreground">{session.email}</p>
              <span className="mt-1 inline-flex items-center rounded border border-border bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {ROLE_LABELS[session.role]}
              </span>
            </div>
          </div>
          <AccountForm
            email={session.email}
            fullName={user?.fullName ?? null}
            phone={user?.phone ?? null}
            timezone={user?.timezone ?? null}
            displayCurrency={user?.displayCurrency ?? null}
            organizationBaseCurrency={organization?.baseCurrency ?? "GBP"}
          />
        </div>
      </div>
    </div>
  );
}

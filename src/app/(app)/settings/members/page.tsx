import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { listMembers, listPendingInvites } from "@/server/services/members";
import { canManageMembers } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberDialog } from "@/features/settings/members/invite-member-dialog";
import { MembersTable } from "@/features/settings/members/members-table";

export const metadata: Metadata = {
  title: "Members",
};

export default async function MembersSettingsPage() {
  const session = await verifySession();
  if (!canManageMembers(session.role)) {
    redirect("/settings/account");
  }

  const [members, invites] = await Promise.all([
    listMembers(session.organizationId),
    listPendingInvites(session.organizationId),
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Members</CardTitle>
        <InviteMemberDialog />
      </CardHeader>
      <CardContent className="p-0">
        <MembersTable members={members} invites={invites} currentUserId={session.userId} />
      </CardContent>
    </Card>
  );
}

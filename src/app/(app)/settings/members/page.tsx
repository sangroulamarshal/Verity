import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifySession } from "@/server/services/session";
import { listMembers, listPendingInvites } from "@/server/services/members";
import { canManageMembers, ROLE_LABELS, type UserRole } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/features/settings/members/invite-member-dialog";

export const metadata: Metadata = { title: "Members" };

export default async function MembersSettingsPage() {
  const session = await verifySession();
  if (!canManageMembers(session.role)) redirect("/settings/account");

  const [members, invites] = await Promise.all([
    listMembers(session.organizationId),
    listPendingInvites(session.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <p className="text-[13px] font-medium">Members</p>
            <p className="text-[12px] text-muted-foreground">
              {members.length} member{members.length === 1 ? "" : "s"} in this organization.
            </p>
          </div>
          <InviteMemberDialog />
        </div>
        {/* Member table -- reuse existing MembersTable which handles role editing / removal */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="border-b border-border bg-elevated/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Member</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Role</th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isSelf = member.id === session.userId;
                return (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.fullName} email={member.email} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">
                            {member.fullName || member.email}
                            {isSelf && <span className="ml-1.5 text-[11px] text-muted-foreground/60">(you)</span>}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {ROLE_LABELS[member.role as UserRole]}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                );
              })}
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b border-border/50 last:border-0 opacity-60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-elevated">
                        <span className="text-[10px] text-muted-foreground">?</span>
                      </div>
                      <p className="text-[13px]">{invite.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="warning">Pending invite</Badge>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {ROLE_LABELS[invite.role as UserRole]}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions";
import { MemberRoleSelect, RemoveMemberButton } from "./member-role-select";
import { revokeInviteAction } from "./actions";
import type { Member, Invite } from "@/server/services/members";

interface MembersTableProps {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
}

function InviteRow({ invite }: { invite: Invite }) {
  const [pending, startTransition] = useTransition();
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{invite.email}</TableCell>
      <TableCell className="text-muted-foreground">Pending invite</TableCell>
      <TableCell className="text-muted-foreground">{ROLE_LABELS[invite.role as UserRole]}</TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => revokeInviteAction(invite.id))}
          >
            {pending ? "Revoking…" : "Revoke"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function MembersTable({ members, invites, currentUserId }: MembersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{member.fullName || member.email}</span>
                {member.fullName && (
                  <span className="text-xs text-muted-foreground">{member.email}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">Active</TableCell>
            <TableCell>
              <MemberRoleSelect userId={member.id} currentRole={member.role as UserRole} />
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                {member.id !== currentUserId && <RemoveMemberButton userId={member.id} />}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} />
        ))}
      </TableBody>
    </Table>
  );
}

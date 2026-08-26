"use client";

import { useActionState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type UserRole } from "@/lib/permissions";
import { changeMemberRoleAction, removeMemberAction, type MemberFormState } from "./actions";

const ROLES: UserRole[] = ["OWNER", "ADMIN", "FINANCE", "ANALYST", "VIEWER"];
const initialState: MemberFormState = {};

interface MemberRoleSelectProps {
  userId: string;
  currentRole: UserRole;
}

export function MemberRoleSelect({ userId, currentRole }: MemberRoleSelectProps) {
  const changeRole = changeMemberRoleAction.bind(null, userId);
  const [state, formAction, pending] = useActionState(changeRole, initialState);

  return (
    <form action={formAction}>
      <Select
        name="role"
        defaultValue={currentRole}
        className="h-8 w-auto text-xs"
        disabled={pending}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </Select>
      {state.message && <p className="mt-1 text-xs text-destructive">{state.message}</p>}
    </form>
  );
}

interface RemoveMemberButtonProps {
  userId: string;
}

export function RemoveMemberButton({ userId }: RemoveMemberButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this member from the organization?")) return;
        startTransition(() => {
          removeMemberAction(userId);
        });
      }}
    >
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}

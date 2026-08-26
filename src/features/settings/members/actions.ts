"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/server/services/session";
import {
  inviteMember,
  revokeInvite,
  changeMemberRole,
  removeMember,
} from "@/server/services/members";
import { auditLogSafely } from "@/server/services/audit-log";
import { canManageMembers } from "@/lib/permissions";
import { inviteMemberSchema, changeRoleSchema } from "./schema";

export interface MemberFormState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

export async function inviteMemberAction(
  _prevState: MemberFormState | undefined,
  formData: FormData
): Promise<MemberFormState> {
  const session = await verifySession();
  if (!canManageMembers(session.role)) {
    return { message: "Only owners and admins can invite members." };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const invite = await inviteMember({
    organizationId: session.organizationId,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedByUserId: session.userId,
  });

  await auditLogSafely({
    action: "MEMBER_INVITED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "organization_invite",
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  revalidatePath("/settings/members");
  return { success: true };
}

export async function revokeInviteAction(inviteId: string): Promise<void> {
  const session = await verifySession();
  if (!canManageMembers(session.role)) return;

  await revokeInvite(session.organizationId, inviteId);
  revalidatePath("/settings/members");
}

export async function changeMemberRoleAction(
  userId: string,
  _prevState: MemberFormState | undefined,
  formData: FormData
): Promise<MemberFormState> {
  const session = await verifySession();
  if (!canManageMembers(session.role)) {
    return { message: "Only owners and admins can change member roles." };
  }

  const parsed = changeRoleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await changeMemberRole(session.organizationId, userId, parsed.data.role);
  if (!result.ok) {
    return {
      message:
        result.error === "LAST_OWNER"
          ? "This organization must always have at least one owner."
          : "Member not found.",
    };
  }

  await auditLogSafely({
    action: "MEMBER_ROLE_CHANGED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "user",
    entityId: userId,
    metadata: { newRole: parsed.data.role },
  });

  revalidatePath("/settings/members");
  return { success: true };
}

export async function removeMemberAction(userId: string): Promise<{ error?: string }> {
  const session = await verifySession();
  if (!canManageMembers(session.role)) {
    return { error: "Only owners and admins can remove members." };
  }

  const result = await removeMember(session.organizationId, userId);
  if (!result.ok) {
    return {
      error:
        result.error === "LAST_OWNER"
          ? "This organization must always have at least one owner."
          : "Member not found.",
    };
  }

  await auditLogSafely({
    action: "MEMBER_REMOVED",
    organizationId: session.organizationId,
    userId: session.userId,
    entityType: "user",
    entityId: userId,
  });

  revalidatePath("/settings/members");
  return {};
}

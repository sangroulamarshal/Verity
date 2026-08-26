import "server-only";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { users, organizationInvites } from "@/db/schema";
import type { UserRole } from "@/lib/permissions";

export type Member = typeof users.$inferSelect;
export type Invite = typeof organizationInvites.$inferSelect;

export async function listMembers(organizationId: string): Promise<Member[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .orderBy(asc(users.createdAt));
}

export async function listPendingInvites(organizationId: string): Promise<Invite[]> {
  return db
    .select()
    .from(organizationInvites)
    .where(
      and(eq(organizationInvites.organizationId, organizationId), isNull(organizationInvites.acceptedAt))
    )
    .orderBy(asc(organizationInvites.createdAt));
}

async function countOwners(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.role, "OWNER")));
  return row?.value ?? 0;
}

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: UserRole;
  invitedByUserId: string;
}

export async function inviteMember(input: InviteMemberInput): Promise<Invite> {
  const [row] = await db
    .insert(organizationInvites)
    .values({
      organizationId: input.organizationId,
      email: input.email.toLowerCase().trim(),
      role: input.role,
      invitedByUserId: input.invitedByUserId,
    })
    .returning();
  return row;
}

export async function revokeInvite(organizationId: string, inviteId: string): Promise<void> {
  await db
    .delete(organizationInvites)
    .where(
      and(eq(organizationInvites.id, inviteId), eq(organizationInvites.organizationId, organizationId))
    );
}

export type ChangeRoleError = "LAST_OWNER" | "NOT_FOUND";

/**
 * The last remaining OWNER can never be demoted — there would be no one
 * left who can manage members/organization settings/billing, and no way
 * back in short of direct DB access. Every other role change is allowed
 * freely (this MVP doesn't gate "only an owner can promote to owner" —
 * canManageMembers already requires OWNER or ADMIN to reach this action
 * at all, see lib/permissions.ts).
 */
export async function changeMemberRole(
  organizationId: string,
  userId: string,
  newRole: UserRole
): Promise<{ ok: true; member: Member } | { ok: false; error: ChangeRoleError }> {
  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!member) return { ok: false, error: "NOT_FOUND" };

  if (member.role === "OWNER" && newRole !== "OWNER") {
    const owners = await countOwners(organizationId);
    if (owners <= 1) return { ok: false, error: "LAST_OWNER" };
  }

  const [updated] = await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .returning();

  return { ok: true, member: updated };
}

export type RemoveMemberError = "LAST_OWNER" | "NOT_FOUND";

export async function removeMember(
  organizationId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: RemoveMemberError }> {
  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!member) return { ok: false, error: "NOT_FOUND" };

  if (member.role === "OWNER") {
    const owners = await countOwners(organizationId);
    if (owners <= 1) return { ok: false, error: "LAST_OWNER" };
  }

  // Deliberately does not delete the user's Supabase Auth identity — this
  // only removes them from the organization's own domain data. A fuller
  // "deactivate the account entirely" flow would need the Supabase Admin
  // API and is out of scope for this MVP membership model.
  await db.delete(users).where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));

  return { ok: true };
}

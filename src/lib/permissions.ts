/**
 * Single source of truth for what each role can do (brief section 37).
 * Deliberately five flat capability checks, not a custom permission
 * builder — "do not create an overly complex custom permission builder"
 * is explicit in the brief, and nothing in this app needs per-resource
 * grants yet.
 */
export type UserRole = "OWNER" | "ADMIN" | "FINANCE" | "ANALYST" | "VIEWER";

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  FINANCE: "Finance",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  OWNER: "Full access, including billing and removing other owners.",
  ADMIN: "Manage members, organization settings, and data.",
  FINANCE: "Create, edit, and import transactions and presets.",
  ANALYST: "View analytics, transactions, and reporting.",
  VIEWER: "Read-only access to everything.",
};

/** Organization profile, base currency, logo, timezone. */
export function canManageOrganization(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Invite, change role, or remove members. */
export function canManageMembers(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Create, edit, delete transactions, presets, and run imports. */
export function canWriteTransactions(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "FINANCE";
}

/** Create, edit, and delete customer records (Phase 5). Same roles as
 * canWriteTransactions — customers are financial counterparty data,
 * naturally paired with the same write access — but kept as its own
 * function rather than reused directly, consistent with this file's
 * one-function-per-domain-capability pattern (brief section 37) rather
 * than overloading canWriteTransactions's name for a different noun. */
export function canWriteCustomers(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "FINANCE";
}

/** View transactions, dashboard, audit log — everyone, including VIEWER.
 * Takes no role parameter since the answer is always true; kept as an
 * explicit function (rather than omitted) so the permission model
 * documents every capability in brief section 37, not just the gated
 * ones. */
export function canViewTransactions(): boolean {
  return true;
}

/** Owners can't be demoted/removed by anyone but another owner, and the
 * last remaining owner can never be demoted or removed at all — see
 * server/services/members.ts. */
export function isOwner(role: UserRole): boolean {
  return role === "OWNER";
}

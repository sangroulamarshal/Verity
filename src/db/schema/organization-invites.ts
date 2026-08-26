import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { userRoleEnum } from "./users";

// A pending invitation to join an organization (brief section 37 —
// Members). There's no transactional email service in this app, so an
// invite doesn't send anything itself yet (Settings > Members surfaces
// the pending row so the inviter can share the signup link manually) —
// what it *does* do is get checked by the register form and the OAuth
// callback: if someone signs up with an email that has a pending invite,
// they're attached to that organization with the invited role instead of
// getting a brand-new organization auto-provisioned. See
// features/auth/actions.ts `provisionOrganization`.
export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("VIEWER"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // Null = not yet accepted. Kept (not deleted) once accepted, as a
    // record of who invited whom and when — same "don't delete history"
    // principle the transaction audit log follows.
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    index("organization_invites_email_idx").on(table.email),
    index("organization_invites_org_id_idx").on(table.organizationId),
  ]
);

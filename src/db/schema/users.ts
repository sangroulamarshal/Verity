import { pgTable, pgEnum, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// Basic role scale for Settings > Members. Permission meaning lives in
// src/lib/permissions.ts (single source of truth for what each role can
// do) rather than being re-derived wherever a role is checked.
export const userRoleEnum = pgEnum("user_role", [
  "OWNER",
  "ADMIN",
  "FINANCE",
  "ANALYST",
  "VIEWER",
]);

// Was previously unique per organization (one user per org, no team
// flow). Settings > Members needs multiple users per org, so the
// uniqueness is dropped here — this is the one schema change in this
// batch that changes an existing constraint rather than only adding
// columns. Existing rows are unaffected (dropping a unique constraint
// never rejects existing data), and the migration backfills `role =
// 'OWNER'` for every pre-existing row, which is exactly correct: today,
// every existing user is the sole (and therefore founding) member of
// their organization.
//
// Credentials (password hashing, Google OAuth, email verification) are
// owned entirely by Supabase Auth — this table only maps Supabase's user
// id to the organization it belongs to. `supabaseUserId` isn't a real
// foreign key: Supabase Auth's `auth.users` table lives in whatever
// Postgres instance the Supabase project uses, which may or may not be
// this same database, so it's just a unique, indexed column rather than
// a `.references()` constraint.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    supabaseUserId: uuid("supabase_user_id").notNull().unique(),
    // Defaults to OWNER, not the least-privileged role: this column's
    // default is what every *existing* single-user-per-org row backfills
    // to (correct — today's sole user founded their organization), and
    // what a newly self-registered/OAuth-provisioned founding user gets
    // too (also correct). An invited member's role is always passed
    // explicitly at insert time by inviteMemberAction/acceptInvite, so
    // the default never actually applies to that path.
    role: userRoleEnum("role").notNull().default("OWNER"),

    fullName: varchar("full_name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 50 }),
    timezone: varchar("timezone", { length: 100 }),
    // Null means "use the organization's base currency" — a real absence,
    // not a stored copy of the org default, so changing the org's base
    // currency later doesn't require touching every user row.
    displayCurrency: varchar("display_currency", { length: 3 }),

    // Free-form, additive preference bags rather than one column per
    // toggle — both are small, MVP-only preference sets (Settings >
    // Notifications / Preferences) with no query or filter need, so a
    // dedicated column per field would be schema churn for no benefit.
    // Each key is optional; missing keys fall back to defaults in code.
    notificationPreferences: jsonb("notification_preferences"),
    preferences: jsonb("preferences"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("users_org_id_idx").on(table.organizationId)]
);

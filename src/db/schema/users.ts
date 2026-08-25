import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// MVP assumption: exactly one user per organization (registration creates
// both together). `organizationId` is unique to enforce this — there is no
// team-invite flow yet, per "do not build complex RBAC yet" in the brief.
// Relaxing this to many-users-per-org later just means dropping the
// `.unique()` and adding an invite flow; it does not change the FK shape.
//
// Credentials (password hashing, Google OAuth, email verification) are
// now owned entirely by Supabase Auth — this table only maps Supabase's
// user id to the organization it belongs to. `supabaseUserId` isn't a
// real foreign key: Supabase Auth's `auth.users` table lives in whatever
// Postgres instance the Supabase project uses, which may or may not be
// this same database, so it's just a unique, indexed column rather than
// a `.references()` constraint.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  supabaseUserId: uuid("supabase_user_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

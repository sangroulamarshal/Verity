import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// MVP assumption: exactly one user per organization (registration creates
// both together). `organizationId` is unique to enforce this — there is no
// team-invite flow yet, per "do not build complex RBAC yet" in the brief.
// Relaxing this to many-users-per-org later just means dropping the
// `.unique()` and adding an invite flow; it does not change the FK shape.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

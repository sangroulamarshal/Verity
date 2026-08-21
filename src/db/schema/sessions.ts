import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

// The raw session token is never stored — only its SHA-256 hash
// (`tokenHash`). The client's cookie holds the raw token; a leaked
// database dump alone can't be replayed as a session. See
// server/services/session.ts for the generate/hash/verify logic.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

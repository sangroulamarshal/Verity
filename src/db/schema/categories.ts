import { pgTable, uuid, text, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const categoryTypeEnum = pgEnum("category_type", ["INCOME", "EXPENSE", "BOTH"]);

export const categories = pgTable(
  "categories",
  {
    id:             uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name:           text("name").notNull(),
    type:           categoryTypeEnum("type").notNull(),
    isArchived:     boolean("is_archived").notNull().default(false),
    createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_org_id_idx").on(t.organizationId)]
);

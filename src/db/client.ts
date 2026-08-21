import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and configure it."
  );
}

// DATABASE_SSL=false is for internal Docker networking / local Postgres.
// In production, require SSL and verify the certificate — never disable
// verification just to make a connection succeed.
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true }
        : false,
});

export const db = drizzle(pool, { schema });

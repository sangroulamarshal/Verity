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
//
// Some managed providers (Supabase's Supavisor pooler, notably) present a
// certificate chain that isn't in Node's default trusted-CA bundle, which
// makes plain `{ rejectUnauthorized: true }` fail with
// SELF_SIGNED_CERT_IN_CHAIN even though the connection is genuinely
// encrypted — Node just doesn't recognize the issuer. DATABASE_CA_CERT
// lets that CA be supplied explicitly (paste the provider's downloaded
// .crt file contents), so verification stays strict rather than being
// turned off. Providers whose certs already chain to a public CA (Neon,
// for example) don't need this set at all.
const caCert = process.env.DATABASE_CA_CERT;

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true, ca: caCert }
        : false,
});

export const db = drizzle(pool, { schema });

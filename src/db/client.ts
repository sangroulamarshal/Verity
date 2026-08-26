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

// max: 1 — this file's module scope runs fresh in every concurrent
// serverless function instance on Vercel; each one gets its own Pool.
// With max: 10, just two concurrent invocations could open up to 20
// connections against Supabase's pooler, and its Session-mode pool_size
// is commonly capped around 15 total — exactly the
// "EMAXCONNSESSION ... max clients reached in session mode" error this
// was hit with. One connection per serverless instance is the standard
// pattern for pg.Pool on Vercel; real multiplexing across concurrent
// requests happens upstream at Supabase's pooler, not in this process.
//
// This alone doesn't fix a Session-mode pooler with a low pool_size —
// if the error recurs, confirm DATABASE_URL points at Supabase's
// Transaction-mode pooler (port 6543), not the Session-mode pooler or a
// direct connection (both port 5432): Project Settings > Database >
// Connection pooling > Mode. Transaction mode is built for exactly this
// many-short-lived-serverless-connections pattern.
const pool = new Pool({
  connectionString,
  max: 1,
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

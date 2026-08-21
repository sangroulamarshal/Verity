// Standalone connection test — mirrors src/db/client.ts's SSL logic
// exactly, so you can debug DATABASE_URL / DATABASE_CA_CERT locally in
// seconds instead of waiting on a Vercel redeploy each time.
//
// Usage (Node 20.6+, no install needed — pg is already a dependency):
//   node --env-file=.env scripts/test-db-connection.mjs
//
// If you don't have a .env file locally, either create one (see
// .env.example) or export the vars in your shell first.

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const caCert = process.env.DATABASE_CA_CERT;

console.log("--- Diagnostic info ---");
console.log("DATABASE_URL set:", !!connectionString);
if (connectionString) {
  // Never print the real string (it contains the password) — just
  // enough to sanity-check it looks right.
  const masked = connectionString.replace(/:[^:@]+@/, ":***@");
  console.log("DATABASE_URL (password masked):", masked);
  console.log("Contains sslmode= :", connectionString.includes("sslmode="));
}
console.log("DATABASE_CA_CERT set:", !!caCert);
if (caCert) {
  console.log("DATABASE_CA_CERT starts with BEGIN CERTIFICATE:", caCert.trim().startsWith("-----BEGIN CERTIFICATE-----"));
  console.log("DATABASE_CA_CERT ends with END CERTIFICATE:", caCert.trim().endsWith("-----END CERTIFICATE-----"));
  console.log("DATABASE_CA_CERT length:", caCert.length);
}
console.log("------------------------\n");

if (!connectionString) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

// Same ssl logic as src/db/client.ts's production branch, forced on
// regardless of local NODE_ENV, since that's the path we're validating.
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 8_000,
  ssl: { rejectUnauthorized: true, ca: caCert },
});

try {
  console.log("Connecting...");
  const client = await pool.connect();
  console.log("✅ Connected. Running a test query...");
  const result = await client.query("select current_database(), current_user, version()");
  console.log("✅ Query succeeded:");
  console.table(result.rows);
  client.release();
} catch (error) {
  console.error("❌ Connection failed:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

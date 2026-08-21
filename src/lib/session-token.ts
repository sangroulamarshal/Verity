import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE_NAME = "verity_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generates a new opaque session token (256 bits of randomness) and its
 * SHA-256 hash. The raw token goes in the client's cookie; only the hash
 * is ever written to the database — a leaked DB dump alone can't be
 * replayed as a live session.
 */
function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashSessionToken(rawToken) };
}

function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Constant-time comparison for two equal-length hex hashes. Not strictly
 * necessary for a DB lookup by unique index (Postgres won't leak timing
 * the way an in-process string `===` scan over an array could), but cheap
 * insurance and documents the intent for anyone who later changes the
 * lookup to something else.
 */
function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export {
  generateSessionToken,
  hashSessionToken,
  hashesEqual,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
};

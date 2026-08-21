import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP-recommended parameters (2024 cheat sheet, "if
// argon2id is available" table: m=19 MiB, t=2, p=1). These are the
// library defaults for @node-rs/argon2, made explicit here so a future
// dependency bump can't silently weaken them.
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // A malformed hash should never crash the login flow — treat it as a
    // failed verification instead of propagating a parse error.
    return false;
  }
}

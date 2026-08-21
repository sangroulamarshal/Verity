import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces an argon2id hash", async () => {
    const hash = await hashPassword("correct horse battery staple 42");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple 42");
    await expect(verifyPassword(hash, "correct horse battery staple 42")).resolves.toBe(
      true
    );
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple 42");
    await expect(verifyPassword(hash, "wrong password entirely")).resolves.toBe(false);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("same password 123");
    const b = await hashPassword("same password 123");
    expect(a).not.toBe(b);
  });

  it("does not throw on a malformed hash — returns false instead", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { generateSessionToken, hashSessionToken } from "./session-token";

describe("session tokens", () => {
  it("generates a raw token distinct from its hash", () => {
    const { rawToken, tokenHash } = generateSessionToken();
    expect(rawToken).not.toBe(tokenHash);
    expect(rawToken.length).toBeGreaterThan(0);
  });

  it("hashes the same raw token to the same value deterministically", () => {
    const { rawToken, tokenHash } = generateSessionToken();
    expect(hashSessionToken(rawToken)).toBe(tokenHash);
  });

  it("produces different raw tokens on each call", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("hash is a 64-character hex string (SHA-256)", () => {
    const { tokenHash } = generateSessionToken();
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schema";

describe("registerSchema", () => {
  const valid = {
    organizationName: "Acme Ltd",
    email: "Founder@Example.com",
    password: "correct-horse-1",
  };

  it("accepts valid input and lowercases/trims the email", () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("founder@example.com");
    }
  });

  it("rejects a missing organization name", () => {
    const result = registerSchema.safeParse({ ...valid, organizationName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a password under 12 characters", () => {
    const result = registerSchema.safeParse({ ...valid, password: "short1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const result = registerSchema.safeParse({ ...valid, password: "allletters-nodigit" });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no letter", () => {
    const result = registerSchema.safeParse({ ...valid, password: "123456789012" });
    expect(result.success).toBe(false);
  });

  it("accepts a password exactly at the 12-character minimum", () => {
    const result = registerSchema.safeParse({ ...valid, password: "abcdefgh1234" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anything-goes-here",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("does not enforce the 12-character policy on login", () => {
    // A pre-existing account's password may predate the current policy —
    // login must still accept it; only its correctness against the
    // stored hash matters.
    const result = loginSchema.safeParse({ email: "user@example.com", password: "old" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "nope", password: "whatever" });
    expect(result.success).toBe(false);
  });
});

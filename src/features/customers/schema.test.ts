import { describe, it, expect } from "vitest";
import { customerSchema } from "./schema";

describe("customerSchema", () => {
  it("accepts a fully valid customer", () => {
    const result = customerSchema.safeParse({
      name: "Acme Ltd",
      email: "Billing@Acme.example",
      phone: "+44 20 7946 0958",
      notes: "Pays net 30.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // lowercased, matching features/auth/schema.ts's email convention
      expect(result.data.email).toBe("billing@acme.example");
    }
  });

  it("accepts a minimal entry with only the required name", () => {
    const result = customerSchema.safeParse({
      name: "Jane Smith",
      email: "",
      phone: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it("rejects a blank name", () => {
    const result = customerSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    const result = customerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email while leaving an empty one valid", () => {
    const invalid = customerSchema.safeParse({ name: "Jane Smith", email: "not-an-email" });
    expect(invalid.success).toBe(false);

    const empty = customerSchema.safeParse({ name: "Jane Smith", email: "" });
    expect(empty.success).toBe(true);
  });

  it("rejects a name over 255 characters", () => {
    const result = customerSchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects notes over 2000 characters", () => {
    const result = customerSchema.safeParse({ name: "Jane Smith", notes: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

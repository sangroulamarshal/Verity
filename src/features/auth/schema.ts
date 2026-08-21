import { z } from "zod";

// OWASP's current guidance favors length over composition rules, but a
// light composition check (a letter + a number) catches the most common
// weak passwords — e.g. 12 spaces, or 12 repeated digits — while still
// keeping rules easy to explain in the UI. Deliberately no upper-bound
// character-class demands (no "must contain a symbol") since those tend
// to push people toward predictable substitutions instead of real
// entropy.
const passwordSchema = z
  .string()
  .min(12, "Must be at least 12 characters.")
  .max(200, "Must be at most 200 characters.")
  .regex(/[A-Za-z]/, "Must contain at least one letter.")
  .regex(/[0-9]/, "Must contain at least one number.");

export const registerSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required.")
    .max(255, "Must be at most 255 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // Deliberately no min-length/complexity check on login — an existing
  // account's password may predate a policy change. Validate shape only;
  // correctness is checked against the stored hash.
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

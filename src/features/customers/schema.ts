import { z } from "zod";

// Optional free-text fields: an empty string (what an untouched form
// field submits as) is treated the same as "not provided" — same helper
// shape as features/transactions/schema.ts's optionalText.
const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(255, "Must be at most 255 characters."),
  // Chained .email(), matching features/auth/schema.ts's exact
  // convention — real RFC-shape validation earns its keep here since
  // this is contact info a person will actually be emailed at, unlike
  // e.g. currency codes elsewhere in this codebase (checked by format
  // only, since there's no equivalent cost to a loose check there).
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, "Must be at most 255 characters.")
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  phone: optionalText(50, "Must be at most 50 characters."),
  notes: optionalText(2000, "Must be at most 2000 characters."),
});

export type CustomerInput = z.infer<typeof customerSchema>;

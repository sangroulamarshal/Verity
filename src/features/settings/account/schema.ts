import { z } from "zod";
import { DISPLAY_CURRENCIES } from "@/lib/currency";

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

export const profileSchema = z.object({
  fullName: optionalText(255, "Must be at most 255 characters."),
  phone: optionalText(50, "Must be at most 50 characters."),
  timezone: optionalText(100, "Must be at most 100 characters."),
  displayCurrency: z
    .enum(DISPLAY_CURRENCIES, { message: "Select a valid currency." })
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});

export type ProfileInput = z.infer<typeof profileSchema>;

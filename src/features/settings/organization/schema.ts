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

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required.").max(255, "Must be at most 255 characters."),
  industry: optionalText(100, "Must be at most 100 characters."),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter country code, e.g. GB.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  baseCurrency: z.enum(DISPLAY_CURRENCIES, { message: "Select a valid base currency." }),
  timezone: z.string().trim().min(1, "Timezone is required.").max(100, "Must be at most 100 characters."),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

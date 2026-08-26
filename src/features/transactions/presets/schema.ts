import { z } from "zod";
import { TRANSACTION_CURRENCIES } from "@/lib/currency";
import { PAYMENT_METHODS } from "@/features/transactions/schema";

const MAX_AMOUNT = 999_999_999.99;

const amountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places.")
  .transform((value) => Number(value))
  .refine((value) => value > 0, "Amount must be greater than zero.")
  .refine((value) => value <= MAX_AMOUNT, `Amount must be at most ${MAX_AMOUNT.toLocaleString()}.`);

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

export const presetSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255, "Must be at most 255 characters."),
  type: z.enum(["INCOME", "EXPENSE"], { message: "Select a transaction type." }),
  category: z.string().trim().min(1, "Category is required.").max(100, "Must be at most 100 characters."),
  amount: amountSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => (TRANSACTION_CURRENCIES as readonly string[]).includes(value),
      `Select one of: ${TRANSACTION_CURRENCIES.join(", ")}.`
    ),
  counterparty: optionalText(255, "Must be at most 255 characters."),
  paymentMethod: z
    .enum(PAYMENT_METHODS, { message: "Select a payment method." })
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  description: optionalText(2000, "Must be at most 2000 characters."),
});

export type PresetFormInput = z.infer<typeof presetSchema>;

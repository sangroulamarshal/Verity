import { z } from "zod";

// Generous but real sanity ceiling — catches fat-finger extra zeros
// without constraining any legitimate SMB transaction.
const MAX_AMOUNT = 999_999_999.99;

// Plain string format check (not z.coerce.number() first) so the
// decimal-place rule is checked against the exact characters the user
// typed, not a float that may have already lost precision by the time
// Zod sees it.
const amountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places.")
  .transform((value) => Number(value))
  .refine((value) => value > 0, "Amount must be greater than zero.")
  .refine(
    (value) => value <= MAX_AMOUNT,
    `Amount must be at most ${MAX_AMOUNT.toLocaleString()}.`
  );

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date in YYYY-MM-DD format.")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date.",
  })
  .refine(
    (value) => {
      const year = Number(value.slice(0, 4));
      return year >= 1900 && year <= 2200;
    },
    { message: "Enter a date between the years 1900 and 2200." }
  )
  .refine(
    (value) => {
      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      return new Date(value).getTime() <= oneDayFromNow.getTime();
    },
    { message: "Date cannot be more than one day in the future." }
  );

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Enter a 3-letter currency code, e.g. GBP.");

const categorySchema = z
  .string()
  .trim()
  .min(1, "Category is required.")
  .max(100, "Must be at most 100 characters.");

// Optional free-text fields: an empty string (what an untouched form
// field submits as) is treated the same as "not provided".
const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

export const transactionSchema = z.object({
  date: dateSchema,
  amount: amountSchema,
  currency: currencySchema,
  type: z.enum(["INCOME", "EXPENSE"], {
    message: "Select a transaction type.",
  }),
  category: categorySchema,
  description: optionalText(2000, "Must be at most 2000 characters."),
  referenceId: optionalText(255, "Must be at most 255 characters."),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

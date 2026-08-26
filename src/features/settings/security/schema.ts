import { z } from "zod";

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changeEmailSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

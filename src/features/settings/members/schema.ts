import { z } from "zod";

const ROLES = ["OWNER", "ADMIN", "FINANCE", "ANALYST", "VIEWER"] as const;

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(ROLES, { message: "Select a role." }),
});

export const changeRoleSchema = z.object({
  role: z.enum(ROLES, { message: "Select a role." }),
});

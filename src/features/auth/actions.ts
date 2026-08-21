"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { createSession, destroySession, getOptionalSession } from "@/server/services/session";
import { recordAuditLog } from "@/server/services/audit-log";
import { loginSchema, registerSchema } from "./schema";

export interface AuthFormState {
  errors?: Record<string, string[]>;
  message?: string;
}

// Computed once per server instance and reused, so a login attempt against
// a non-existent email still costs roughly the same as one against a real
// email — otherwise response timing itself would leak which emails are
// registered. The dummy password is fixed and never compared to anything
// real; only the compute cost matters.
const dummyHashPromise = hashPassword("timing-safety-dummy-password-000");

async function auditLogSafely(...args: Parameters<typeof recordAuditLog>) {
  try {
    await recordAuditLog(...args);
  } catch (error) {
    // Audit logging must never block a legitimate login/registration.
    console.error("Failed to write audit log:", error);
  }
}

export async function registerAction(
  _prevState: AuthFormState | undefined,
  formData: FormData
): Promise<AuthFormState> {
  const ip = await getClientIp();
  const rateLimit = checkRateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { message: "Too many registration attempts. Please try again later." };
  }

  const parsed = registerSchema.safeParse({
    organizationName: formData.get("organizationName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { organizationName, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return {
      errors: { email: ["This email is already registered. Try logging in instead."] },
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: organizationName })
      .returning({ id: organizations.id });

    const [user] = await tx
      .insert(users)
      .values({ organizationId: org.id, email, passwordHash })
      .returning({ id: users.id, organizationId: users.organizationId });

    return user;
  });

  await createSession(newUser.id);
  await auditLogSafely({
    action: "USER_REGISTERED",
    organizationId: newUser.organizationId,
    userId: newUser.id,
  });

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState | undefined,
  formData: FormData
): Promise<AuthFormState> {
  const ip = await getClientIp();
  const ipLimit = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return { message: "Too many login attempts. Please try again later." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  // Per-account limit, independent of IP — protects one account from
  // distributed brute force across many source IPs.
  const accountLimit = checkRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
  if (!accountLimit.allowed) {
    return { message: "Too many login attempts for this account. Please try again later." };
  }

  const rows = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];
  const genericError = { message: "Invalid email or password." };

  if (!user) {
    // Burn roughly the same time as a real verification so response
    // timing doesn't reveal whether the email is registered.
    await verifyPassword(await dummyHashPromise, password);
    await auditLogSafely({
      action: "LOGIN_FAILED",
      metadata: { email },
    });
    return genericError;
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    await auditLogSafely({
      action: "LOGIN_FAILED",
      organizationId: user.organizationId,
      userId: user.id,
    });
    return genericError;
  }

  await createSession(user.id);
  await auditLogSafely({
    action: "LOGIN_SUCCEEDED",
    organizationId: user.organizationId,
    userId: user.id,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const session = await getOptionalSession();
  await destroySession();

  if (session) {
    await auditLogSafely({
      action: "LOGOUT",
      organizationId: session.organizationId,
      userId: session.userId,
    });
  }

  redirect("/login");
}

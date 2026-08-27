import "server-only";
import { db } from "@/db/client";
import { auditLogs, users } from "@/db/schema";
import { and, desc, eq, gte, lte, count } from "drizzle-orm";
import { logServerError } from "@/server/log";

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN_SUCCEEDED"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "TRANSACTION_CREATED"
  | "TRANSACTION_UPDATED"
  | "TRANSACTION_DELETED"
  | "TRANSACTION_PRESET_CREATED"
  | "TRANSACTION_PRESET_UPDATED"
  | "TRANSACTION_PRESET_DELETED"
  | "IMPORT_COMMITTED"
  | "ORGANIZATION_UPDATED"
  | "ACCOUNT_UPDATED"
  | "PREFERENCES_UPDATED"
  | "MEMBER_INVITED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED"
  | "PASSWORD_CHANGED"
  | "EMAIL_CHANGE_REQUESTED"
  | "SIGNED_OUT_ALL_SESSIONS";

interface RecordAuditLogInput {
  action: AuditAction;
  organizationId?: string | null;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  /**
   * Free-form context. NEVER put a password, session token, or other
   * secret in here — this table is a permanent, queryable record.
   */
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  await db.insert(auditLogs).values({
    action: input.action,
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}

/**
 * Wraps recordAuditLog so a logging failure can never block the real
 * action it's describing (a login, a transaction write, ...). Shared
 * across every feature that writes audit log entries — introduced in
 * Phase 2 for auth, reused as-is starting Phase 3 rather than
 * re-implemented per feature.
 */
export async function auditLogSafely(...args: Parameters<typeof recordAuditLog>) {
  try {
    await recordAuditLog(...args);
  } catch (error) {
    const [input] = args;
    logServerError(
      "audit-log",
      "Failed to write audit log entry",
      {
        action: input.action,
        organizationId: input.organizationId ?? undefined,
        userId: input.userId ?? undefined,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      error
    );
  }
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
  userId: string | null;
  userEmail: string | null;
}

export interface ListAuditLogOptions {
  entityType?: string;
  action?: AuditAction;
  userId?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAuditLogResult {
  rows: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 25;

/**
 * Scoped to `organizationId` like every other org-owned query — see
 * docs/ARCHITECTURE.md. Joins `users` (left join) so a removed member's
 * past actions still render with the email they had at the time, rather
 * than disappearing or crashing on a missing FK — audit history is never
 * deleted just because the actor left (brief section 17: "the old value
 * must not simply disappear").
 */
export async function listAuditLog(
  organizationId: string,
  options: ListAuditLogOptions = {}
): Promise<ListAuditLogResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(auditLogs.organizationId, organizationId)];
  if (options.entityType) conditions.push(eq(auditLogs.entityType, options.entityType));
  if (options.action) conditions.push(eq(auditLogs.action, options.action));
  if (options.userId) conditions.push(eq(auditLogs.userId, options.userId));
  if (options.entityId) conditions.push(eq(auditLogs.entityId, options.entityId));
  if (options.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(options.dateFrom)));
  if (options.dateTo) conditions.push(lte(auditLogs.createdAt, new Date(`${options.dateTo}T23:59:59.999Z`)));

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;

  return {
    rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

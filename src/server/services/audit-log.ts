import "server-only";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN_SUCCEEDED"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "TRANSACTION_CREATED"
  | "TRANSACTION_UPDATED"
  | "TRANSACTION_DELETED";

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
    console.error("Failed to write audit log:", error);
  }
}

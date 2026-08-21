import "server-only";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN_SUCCEEDED"
  | "LOGIN_FAILED"
  | "LOGOUT";

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

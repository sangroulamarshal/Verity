import "server-only";

/**
 * Consistent, greppable server error logging.
 *
 * Every catch-all `console.error` in this codebase used to be a bare
 * `console.error("X failed unexpectedly:", error)` with no identifying
 * context — so a production log full of "updateTransactionAction failed
 * unexpectedly" lines gave no way to tell which submission, which
 * transaction, or which organization any one of them belonged to. The
 * context (organizationId, userId, the transaction's own id, ...) was
 * always available as a local variable right at the call site; it just
 * wasn't being written down.
 *
 * This doesn't replace a real structured-logging/observability service
 * (Sentry, Axiom, etc.) — it's a minimal, dependency-free step that
 * makes today's plain console/Vercel logs actually searchable by the
 * thing that broke, e.g. `grep 'transactionId=abc-123'`.
 */
export function logServerError(
  scope: string,
  message: string,
  context: Record<string, string | number | null | undefined>,
  error: unknown
): void {
  const contextStr = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  console.error(`[${scope}] ${message}${contextStr ? ` (${contextStr})` : ""}`, error);
}

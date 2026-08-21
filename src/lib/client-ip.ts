import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limit keying only — NOT for security
 * decisions that assume it can't be spoofed. `x-forwarded-for` is only
 * trustworthy if the app sits behind a reverse proxy that sets it
 * correctly and strips any client-supplied value first (true for a
 * typical Docker/nginx deployment; if self-hosting without a proxy in
 * front, this header is attacker-controlled and this function degrades
 * to grouping all traffic under "unknown").
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

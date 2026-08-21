import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";

// Optimistic check ONLY — cookie presence, no database call. Next.js's own
// guidance is explicit that Proxy must not be the sole authorization
// boundary and must avoid slow (DB) work since it runs on every request,
// including prefetches. The real, authoritative check is
// server/services/session.ts's verifySession(), called at the top of
// every protected Server Component/Action — that's what actually decides
// whether a session is valid (expired/revoked sessions have a cookie that
// still "looks present" to this proxy, but verifySession() will reject
// them against the database).
const PROTECTED_PREFIXES = ["/dashboard", "/transactions"];
const AUTH_PAGES = ["/login", "/register"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

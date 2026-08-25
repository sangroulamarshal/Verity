import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Note: this is no longer a purely "optimistic, no slow work" check —
// `supabase.auth.getUser()` calls out to Supabase's Auth server on every
// request to revalidate the session (Supabase's own guidance: never trust
// `getSession()` alone in server code, since it only decodes the JWT
// locally without confirming it hasn't been revoked). That's a deliberate
// trade-off of moving auth to Supabase: this proxy is now the
// authoritative check, not just a fast pre-check in front of a DB lookup
// deeper in the request. In practice this call is fast and Supabase
// fronts it with its own caching, but it's no longer "no network call in
// middleware" the way the old cookie-presence check was.
const PROTECTED_PREFIXES = ["/dashboard", "/transactions", "/imports"];
const AUTH_PAGES = ["/login", "/register"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Must be `response`, not NextResponse.next() — it carries whatever
  // refreshed auth cookies setAll() above attached.
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

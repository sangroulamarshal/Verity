import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and add your Supabase project's URL and anon key.`
    );
  }
  return value;
}

/**
 * Creates a request-scoped Supabase client. Must be called fresh per
 * request (Server Component render, Server Action invocation, or Route
 * Handler call) rather than module-level, since it binds to that
 * request's cookies.
 *
 * `setAll` is wrapped in a try/catch because Server Components are
 * allowed to *read* cookies but not set them — Supabase attempts a
 * proactive token refresh on every call, which fails harmlessly there.
 * The proxy (middleware) is what actually persists a refreshed session;
 * see src/proxy.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — no-op, see doc comment above.
          }
        },
      },
    }
  );
}

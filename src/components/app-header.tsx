import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getOptionalSession } from "@/server/services/session";
import { logoutAction } from "@/features/auth/actions";

/**
 * Auth-aware header, added in Phase 2. Uses getOptionalSession() (the
 * same authoritative, DB-backed check used everywhere else) rather than
 * trusting cookie presence, so the nav shown always matches reality even
 * if a session was just revoked. Full authenticated nav (customers,
 * transactions, imports, risk, cash flow) is added as those routes exist.
 */
export async function AppHeader() {
  const session = await getOptionalSession();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
            V
          </span>
          <span className="text-sm font-medium tracking-tight">Verity</span>
        </Link>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

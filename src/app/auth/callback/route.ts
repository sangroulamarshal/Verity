import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { provisionOrganization } from "@/features/auth/actions";
import { auditLogSafely } from "@/server/services/audit-log";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.supabaseUserId, data.user.id))
        .limit(1);

      if (!existing) {
        // First time this Supabase identity has reached the app — there's
        // no organization name to ask for mid-OAuth-redirect the way the
        // password register form collects one up front, so this picks a
        // reasonable default. There's no settings page yet to rename it
        // from (see README phase table) — that's a known follow-up, not
        // an oversight here.
        const displayName =
          (data.user.user_metadata?.full_name as string | undefined) ??
          data.user.email ??
          "New";
        const newUser = await provisionOrganization({
          organizationName: `${displayName}'s organization`,
          email: data.user.email ?? "",
          supabaseUserId: data.user.id,
        });

        await auditLogSafely({
          action: "USER_REGISTERED",
          organizationId: newUser.organizationId,
          userId: newUser.id,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

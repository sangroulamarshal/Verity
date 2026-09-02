import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { getUserById } from "@/server/services/account";
import {
  AppearanceControl,
  PreferencesForm,
} from "@/features/settings/preferences/preferences-form";
import {
  preferencesSchema,
  DEFAULT_PREFERENCES,
} from "@/features/settings/preferences/schema";

export const metadata: Metadata = { title: "Preferences" };

export default async function PreferencesSettingsPage() {
  const session = await verifySession();
  const user = await getUserById(session.userId);
  const parsed = preferencesSchema.safeParse(user?.preferences ?? {});
  const preferences = parsed.success ? parsed.data : DEFAULT_PREFERENCES;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-medium">Appearance</p>
          <p className="text-[12px] text-muted-foreground">
            Interface theme and display density.
          </p>
        </div>
        <div className="px-5 py-4">
          <AppearanceControl />
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-medium">Preferences</p>
          <p className="text-[12px] text-muted-foreground">
            Date format, number format, and default transaction view.
          </p>
        </div>
        <div className="px-5 py-4">
          <PreferencesForm preferences={preferences} />
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { getUserById } from "@/server/services/account";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppearanceControl, PreferencesForm } from "@/features/settings/preferences/preferences-form";
import { preferencesSchema, DEFAULT_PREFERENCES } from "@/features/settings/preferences/schema";

export const metadata: Metadata = {
  title: "Preferences",
};

export default async function PreferencesSettingsPage() {
  const session = await verifySession();
  const user = await getUserById(session.userId);
  const parsed = preferencesSchema.safeParse(user?.preferences ?? {});
  const preferences = parsed.success ? parsed.data : DEFAULT_PREFERENCES;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <AppearanceControl />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesForm preferences={preferences} />
        </CardContent>
      </Card>
    </div>
  );
}

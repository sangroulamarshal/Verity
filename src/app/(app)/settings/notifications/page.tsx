import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { getUserById } from "@/server/services/account";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationsForm } from "@/features/settings/notifications/notifications-form";
import {
  notificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/features/settings/notifications/schema";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsSettingsPage() {
  const session = await verifySession();
  const user = await getUserById(session.userId);

  const parsed = notificationPreferencesSchema.safeParse(user?.notificationPreferences ?? {});
  const preferences = parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFERENCES;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <NotificationsForm preferences={preferences} />
      </CardContent>
    </Card>
  );
}

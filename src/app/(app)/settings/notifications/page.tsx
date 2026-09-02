import type { Metadata } from "next";
import { verifySession } from "@/server/services/session";
import { getUserById } from "@/server/services/account";
import { NotificationsForm } from "@/features/settings/notifications/notifications-form";
import {
  notificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/features/settings/notifications/schema";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsSettingsPage() {
  const session = await verifySession();
  const user = await getUserById(session.userId);

  const parsed = notificationPreferencesSchema.safeParse(user?.notificationPreferences ?? {});
  const preferences = parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFERENCES;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-medium">Notifications</p>
          <p className="text-[12px] text-muted-foreground">
            Choose which events trigger a notification. Email delivery is coming in a future release.
          </p>
        </div>
        <div className="px-5 py-4">
          <NotificationsForm preferences={preferences} />
        </div>
      </div>
    </div>
  );
}

import { z } from "zod";

// Deliberately excludes risk-alert / cash-flow-warning toggles that the
// brief's example list included (section 38) — Risk and Cash Flow aren't
// built in this pass (see the scope decision at the top of this batch of
// work), and a toggle for a notification type that can never fire would
// be exactly the kind of fake control the "keep nav to what's real"
// decision was meant to avoid. Only preferences tied to features that
// actually exist (Imports, Security) are offered.
export const notificationPreferencesSchema = z.object({
  importCompleted: z.coerce.boolean().optional().default(false),
  newLogin: z.coerce.boolean().optional().default(false),
  passwordChanged: z.coerce.boolean().optional().default(false),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  importCompleted: true,
  newLogin: true,
  passwordChanged: true,
};

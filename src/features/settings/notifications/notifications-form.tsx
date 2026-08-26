"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferencesAction, type NotificationFormState } from "./actions";
import type { NotificationPreferences } from "./schema";

interface NotificationsFormProps {
  preferences: NotificationPreferences;
}

const initialState: NotificationFormState = {};

const TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  {
    key: "importCompleted",
    label: "Import completed",
    description: "When a CSV or Excel import finishes processing.",
  },
  {
    key: "newLogin",
    label: "New login",
    description: "When your account is signed in from a new device.",
  },
  {
    key: "passwordChanged",
    label: "Password changed",
    description: "When your password is changed.",
  },
];

export function NotificationsForm({ preferences }: NotificationsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        These preferences are saved now; email/push delivery isn&apos;t wired up yet, so nothing is
        sent until that&apos;s built.
      </p>
      {TOGGLES.map((toggle) => (
        <label key={toggle.key} className="flex items-start gap-3 rounded-md border border-border p-3">
          <input
            type="checkbox"
            name={toggle.key}
            defaultChecked={preferences[toggle.key]}
            className="mt-0.5 size-4 rounded border-input"
          />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{toggle.label}</span>
            <span className="text-xs text-muted-foreground">{toggle.description}</span>
          </span>
        </label>
      ))}

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.success && <p className="text-sm text-income">Saved.</p>}

      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

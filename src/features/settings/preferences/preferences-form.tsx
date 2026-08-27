"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAccountTheme } from "@/components/use-account-theme";
import { updatePreferencesAction, type PreferencesFormState } from "./actions";
import { DATE_FORMATS, DEFAULT_TRANSACTION_VIEWS, type Preferences } from "./schema";

const initialState: PreferencesFormState = {};

const VIEW_LABELS: Record<(typeof DEFAULT_TRANSACTION_VIEWS)[number], string> = {
  ALL: "All",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

export function AppearanceControl() {
  // Also persists to the account — see use-account-theme.ts. Previously
  // this called next-themes' setTheme() directly, which only ever wrote
  // to this browser's localStorage.
  const { theme, setTheme } = useAccountTheme();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="appearance">Appearance</Label>
      <Select
        id="appearance"
        value={theme ?? "system"}
        onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}
        className="max-w-xs"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </Select>
    </div>
  );
}

export function PreferencesForm({ preferences }: { preferences: Preferences }) {
  const [state, formAction, pending] = useActionState(updatePreferencesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dateFormat">Date format</Label>
        <Select id="dateFormat" name="dateFormat" defaultValue={preferences.dateFormat} className="max-w-xs">
          {DATE_FORMATS.map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultTransactionView">Default transaction view</Label>
        <Select
          id="defaultTransactionView"
          name="defaultTransactionView"
          defaultValue={preferences.defaultTransactionView}
          className="max-w-xs"
        >
          {DEFAULT_TRANSACTION_VIEWS.map((view) => (
            <option key={view} value={view}>
              {VIEW_LABELS[view]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Language</Label>
        <Select disabled defaultValue="en" className="max-w-xs">
          <option value="en">English</option>
        </Select>
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.success && <p className="text-sm text-income">Saved.</p>}

      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

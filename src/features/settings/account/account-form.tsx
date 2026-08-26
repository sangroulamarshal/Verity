"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DISPLAY_CURRENCIES } from "@/lib/currency";
import { updateProfileAction, type ProfileFormState } from "./actions";

interface AccountFormProps {
  email: string;
  fullName: string | null;
  phone: string | null;
  timezone: string | null;
  displayCurrency: string | null;
  organizationBaseCurrency: string;
}

const initialState: ProfileFormState = {};

export function AccountForm({
  email,
  fullName,
  phone,
  timezone,
  displayCurrency,
  organizationBaseCurrency,
}: AccountFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Change your email from the Security tab.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName ?? ""} />
        {state.errors?.fullName && (
          <p className="text-xs text-destructive">{state.errors.fullName[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">
          Phone <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="phone" name="phone" defaultValue={phone ?? ""} />
        {state.errors?.phone && <p className="text-xs text-destructive">{state.errors.phone[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" placeholder="Asia/Kathmandu" defaultValue={timezone ?? ""} />
        {state.errors?.timezone && (
          <p className="text-xs text-destructive">{state.errors.timezone[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayCurrency">Default display currency</Label>
        <Select id="displayCurrency" name="displayCurrency" defaultValue={displayCurrency ?? ""}>
          <option value="">Use organization default ({organizationBaseCurrency})</option>
          {DISPLAY_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.success && <p className="text-sm text-income">Saved.</p>}

      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

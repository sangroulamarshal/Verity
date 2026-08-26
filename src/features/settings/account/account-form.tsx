"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
    // Only re-run when the action reports a fresh success — see the
    // matching note in transaction-form.tsx's onSuccess effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

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
          {/*
            The empty-value option's effective currency is always
            organizationBaseCurrency (it's only ever selected when the
            user has no personal override — see displayCurrency ?? ""
            above). Labeling it with the resolved code, the same way the
            header's CurrencySelector does, is what actually fixed the
            "these two don't match" bug: previously this said "Use
            organization default (GBP)" while the header just said
            "GBP" for the exact same state, which read as disagreement
            even though nothing was out of sync.
          */}
          <option value="">{organizationBaseCurrency} (organization default)</option>
          {DISPLAY_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
        {!displayCurrency && (
          <p className="text-xs text-muted-foreground">
            Following your organization&rsquo;s default. Pick a currency above to set a personal
            preference instead.
          </p>
        )}
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.success && <p className="text-sm text-income">Saved.</p>}

      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

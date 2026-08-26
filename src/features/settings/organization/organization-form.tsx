"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DISPLAY_CURRENCIES } from "@/lib/currency";
import { updateOrganizationAction, type OrganizationFormState } from "./actions";

interface OrganizationFormProps {
  name: string;
  industry: string | null;
  country: string | null;
  baseCurrency: string;
  timezone: string;
}

const initialState: OrganizationFormState = {};

export function OrganizationForm({
  name,
  industry,
  country,
  baseCurrency,
  timezone,
}: OrganizationFormProps) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" defaultValue={name} required />
        {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="industry">
            Industry <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input id="industry" name="industry" defaultValue={industry ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">
            Country <span className="text-muted-foreground">(optional, e.g. NP)</span>
          </Label>
          <Input id="country" name="country" maxLength={2} defaultValue={country ?? ""} />
          {state.errors?.country && (
            <p className="text-xs text-destructive">{state.errors.country[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="baseCurrency">Base / reporting currency</Label>
          <Select id="baseCurrency" name="baseCurrency" defaultValue={baseCurrency} required>
            {DISPLAY_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Used for dashboard totals and new transaction conversions. Changing this never
            rewrites amounts already recorded.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={timezone} required />
          {state.errors?.timezone && (
            <p className="text-xs text-destructive">{state.errors.timezone[0]}</p>
          )}
        </div>
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.success && <p className="text-sm text-income">Saved.</p>}

      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

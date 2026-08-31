"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerFormState } from "./actions";

export interface CustomerFormDefaults {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface CustomerFormProps {
  action: (state: CustomerFormState | undefined, formData: FormData) => Promise<CustomerFormState>;
  defaultValues?: CustomerFormDefaults;
  submitLabel: string;
  pendingLabel: string;
  onSuccess?: () => void;
}

const initialState: CustomerFormState = {};

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
  pendingLabel,
  onSuccess,
}: CustomerFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Ltd"
          defaultValue={state.values?.name ?? defaultValues?.name}
          required
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={state.values?.email ?? defaultValues?.email}
            aria-invalid={!!state.errors?.email}
          />
          {state.errors?.email && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            Phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={state.values?.phone ?? defaultValues?.phone}
            aria-invalid={!!state.errors?.phone}
          />
          {state.errors?.phone && (
            <p className="text-xs text-destructive">{state.errors.phone[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={state.values?.notes ?? defaultValues?.notes}
          aria-invalid={!!state.errors?.notes}
        />
        {state.errors?.notes && (
          <p className="text-xs text-destructive">{state.errors.notes[0]}</p>
        )}
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

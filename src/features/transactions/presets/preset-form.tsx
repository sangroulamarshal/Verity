"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TRANSACTION_CURRENCIES } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../schema";
import type { PresetFormState } from "./actions";

export interface PresetFormDefaults {
  name?: string;
  type?: "INCOME" | "EXPENSE";
  category?: string;
  amount?: string;
  currency?: string;
  counterparty?: string;
  paymentMethod?: string;
  description?: string;
}

interface PresetFormProps {
  categories?: string[];
  action: (state: PresetFormState | undefined, formData: FormData) => Promise<PresetFormState>;
  defaultValues?: PresetFormDefaults;
  submitLabel: string;
  pendingLabel: string;
  onSuccess?: () => void;
}

const initialState: PresetFormState = {};

export function PresetForm({
  action,
  defaultValues,
  submitLabel,
  pendingLabel,
  onSuccess,
  categories = [],
}: PresetFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Preset name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Monthly office rent"
          defaultValue={state.values?.name ?? defaultValues?.name}
          required
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select
            key={state.values?.type ?? defaultValues?.type ?? "EXPENSE"}
            id="type"
            name="type"
            defaultValue={state.values?.type ?? defaultValues?.type ?? "EXPENSE"}
            required
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <CategoryPickerField
            name="category"
            defaultValue={state.values?.category ?? defaultValues?.category ?? ""}
            categories={categories}
          />
          {state.errors?.category && (
            <p className="text-xs text-destructive">{state.errors.category[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={state.values?.amount ?? defaultValues?.amount}
            required
            aria-invalid={!!state.errors?.amount}
          />
          {state.errors?.amount && (
            <p className="text-xs text-destructive">{state.errors.amount[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Select
            key={state.values?.currency ?? defaultValues?.currency ?? "GBP"}
            id="currency"
            name="currency"
            defaultValue={state.values?.currency ?? defaultValues?.currency ?? "GBP"}
            required
          >
            {TRANSACTION_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="counterparty">
            Vendor <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="counterparty"
            name="counterparty"
            defaultValue={state.values?.counterparty ?? defaultValues?.counterparty}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paymentMethod">
            Payment method <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select
            key={state.values?.paymentMethod ?? defaultValues?.paymentMethod ?? ""}
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={state.values?.paymentMethod ?? defaultValues?.paymentMethod ?? ""}
          >
            <option value="">Not specified</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={state.values?.description ?? defaultValues?.description}
        />
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

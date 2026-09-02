"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TRANSACTION_CURRENCIES } from "@/lib/currency";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "./schema";
import { ExchangeRatePreview } from "./exchange-rate-preview";
import { CustomerPicker } from "./customer-picker";
import type { TransactionFormState } from "./actions";
import { CategoryPickerField } from "./category-picker";

export interface TransactionFormDefaults {
  date?: string;
  amount?: string;
  currency?: string;
  type?: "INCOME" | "EXPENSE";
  category?: string;
  counterparty?: string;
  paymentMethod?: string;
  description?: string;
  referenceId?: string;
  presetId?: string;
  customerId?: string;
}

interface TransactionFormProps {
  categories?: string[];
  action: (
    state: TransactionFormState | undefined,
    formData: FormData
  ) => Promise<TransactionFormState>;
  defaultValues?: TransactionFormDefaults;
  submitLabel: string;
  pendingLabel: string;
  onSuccess?: () => void;
}

const initialState: TransactionFormState = {};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({
  action,
  defaultValues,
  submitLabel,
  pendingLabel,
  onSuccess,
}: TransactionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const [amount, setAmount] = useState(state.values?.amount ?? defaultValues?.amount ?? "");
  const [currency, setCurrency] = useState(
    state.values?.currency ?? defaultValues?.currency ?? "GBP"
  );

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
    }
    // Only re-run when the action reports a fresh success â€” including
    // `onSuccess` itself would re-fire this on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {defaultValues?.presetId && (
        <input type="hidden" name="presetId" value={defaultValues.presetId} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={state.values?.date ?? defaultValues?.date ?? todayIso()}
            required
            aria-invalid={!!state.errors?.date}
          />
          {state.errors?.date && (
            <p className="text-xs text-destructive">{state.errors.date[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select
            key={state.values?.type ?? defaultValues?.type ?? "EXPENSE"}
            id="type"
            name="type"
            defaultValue={state.values?.type ?? defaultValues?.type ?? "EXPENSE"}
            required
            aria-invalid={!!state.errors?.type}
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </Select>
          {state.errors?.type && (
            <p className="text-xs text-destructive">{state.errors.type[0]}</p>
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
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
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
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            required
            aria-invalid={!!state.errors?.currency}
          >
            {TRANSACTION_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
          {state.errors?.currency && (
            <p className="text-xs text-destructive">{state.errors.currency[0]}</p>
          )}
        </div>
      </div>

      <ExchangeRatePreview amount={amount} currency={currency} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <CategoryPickerField
          name="category"
          defaultValue={state.values?.category ?? defaultValues?.category ?? ""}
          categories={props.categories ?? []}
        />
        {state.errors?.category && (
          <p className="text-xs text-destructive">{state.errors.category[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CustomerPicker
          defaultCounterparty={state.values?.counterparty ?? defaultValues?.counterparty}
          defaultCustomerId={state.values?.customerId ?? defaultValues?.customerId}
          error={state.errors?.counterparty?.[0]}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paymentMethod">
            Payment method <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select
            key={state.values?.paymentMethod ?? defaultValues?.paymentMethod ?? ""}
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={state.values?.paymentMethod ?? defaultValues?.paymentMethod ?? ""}
            aria-invalid={!!state.errors?.paymentMethod}
          >
            <option value="">Not specified</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </Select>
          {state.errors?.paymentMethod && (
            <p className="text-xs text-destructive">{state.errors.paymentMethod[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="referenceId">
          Reference <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="referenceId"
          name="referenceId"
          defaultValue={state.values?.referenceId ?? defaultValues?.referenceId}
          aria-invalid={!!state.errors?.referenceId}
        />
        {state.errors?.referenceId && (
          <p className="text-xs text-destructive">{state.errors.referenceId[0]}</p>
        )}
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
          aria-invalid={!!state.errors?.description}
        />
        {state.errors?.description && (
          <p className="text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

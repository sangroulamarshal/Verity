"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          autoComplete="organization"
          required
          aria-invalid={!!state?.errors?.organizationName}
        />
        {state?.errors?.organizationName && (
          <p className="text-xs text-destructive">{state.errors.organizationName[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!state?.errors?.email}
        />
        {state?.errors?.email && (
          <p className="text-xs text-destructive">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!state?.errors?.password}
        />
        <p className="text-xs text-muted-foreground">
          At least 12 characters, with a letter and a number.
        </p>
        {state?.errors?.password && (
          <p className="text-xs text-destructive">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

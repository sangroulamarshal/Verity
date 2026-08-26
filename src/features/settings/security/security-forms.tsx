"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  changeEmailAction,
  signOutAllSessionsAction,
  type SecurityFormState,
} from "./actions";

const initialState: SecurityFormState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
        {state.errors?.newPassword && (
          <p className="text-xs text-destructive">{state.errors.newPassword[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
        {state.errors?.confirmPassword && (
          <p className="text-xs text-destructive">{state.errors.confirmPassword[0]}</p>
        )}
      </div>
      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.success && <p className="text-sm text-income">Password updated.</p>}
      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export function ChangeEmailForm() {
  const [state, formAction, pending] = useActionState(changeEmailAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newEmail">New email</Label>
        <Input id="newEmail" name="newEmail" type="email" required />
        {state.errors?.newEmail && (
          <p className="text-xs text-destructive">{state.errors.newEmail[0]}</p>
        )}
      </div>
      {state.message && (
        <p className={`text-sm ${state.success ? "text-muted-foreground" : "text-destructive"}`}>
          {state.message}
        </p>
      )}
      {state.success && !state.message && <p className="text-sm text-income">Email updated.</p>}
      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Updating…" : "Update email"}
      </Button>
    </form>
  );
}

export function SignOutEverywhereButton() {
  return (
    <form action={signOutAllSessionsAction}>
      <Button
        type="submit"
        variant="outline"
        onClick={(event) => {
          if (!confirm("Sign out of Verity on every device? You'll need to log in again here too.")) {
            event.preventDefault();
          }
        }}
      >
        Sign out of all devices
      </Button>
    </form>
  );
}

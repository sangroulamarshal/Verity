import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChangePasswordForm,
  ChangeEmailForm,
  SignOutEverywhereButton,
} from "@/features/settings/security/security-forms";

export const metadata: Metadata = {
  title: "Security",
};

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email address</CardTitle>
          <CardDescription>
            If your Supabase project requires confirmation, you&apos;ll get a link at both your old
            and new address before this takes effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangeEmailForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Sign out everywhere if you think your account was accessed by someone else.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutEverywhereButton />
        </CardContent>
      </Card>
    </div>
  );
}

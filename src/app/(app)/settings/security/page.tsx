import type { Metadata } from "next";
import {
  ChangePasswordForm,
  ChangeEmailForm,
  SignOutEverywhereButton,
} from "@/features/settings/security/security-forms";

export const metadata: Metadata = { title: "Security" };

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[13px] font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function SecuritySettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsSection
        title="Password"
        description="Change your account password."
      >
        <ChangePasswordForm />
      </SettingsSection>

      <SettingsSection
        title="Email address"
        description="Update the email address linked to your account. A confirmation may be required at your old and new address."
      >
        <ChangeEmailForm />
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        description="Sign out of all devices if you believe your account has been accessed by someone else."
      >
        <SignOutEverywhereButton />
      </SettingsSection>
    </div>
  );
}

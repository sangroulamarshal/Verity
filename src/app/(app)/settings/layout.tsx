import { verifySession } from "@/server/services/session";
import { SettingsNav } from "@/components/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, organization, and preferences.
        </p>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <SettingsNav role={session.role} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

import { verifySession } from "@/server/services/session";
import { SettingsNav } from "@/components/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Manage your account, organization, and preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        {/* Left nav */}
        <SettingsNav role={session.role} />
        {/* Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-4">
      <div className="mb-4">
        <h1 className="text-[18px] font-semibold tracking-tight">Reports</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Generate and export financial reports.</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-[6px] border border-border bg-surface py-20 text-center">
        <p className="text-[14px] font-medium text-muted-foreground">Coming in a future release</p>
        <p className="text-[13px] text-muted-foreground/60 max-w-sm">
          This page is planned. Use the existing features in the sidebar to access similar functionality.
        </p>
      </div>
    </div>
  );
}

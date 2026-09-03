import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="mt-2 h-3.5 w-72" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[6px] border border-border bg-surface px-5 py-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-1.5 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[6px] border border-border bg-surface p-5">
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-56 mb-5" />
            <Skeleton className="h-44 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Anomaly summary */}
      <div className="mt-4 rounded-[6px] border border-border bg-surface p-5">
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-3 w-64 mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-md" />
                <div>
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

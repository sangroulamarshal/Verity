import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-3.5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[6px] border border-border bg-surface px-5 py-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-6 w-28" />
            <Skeleton className="mt-1.5 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Tab strip + table */}
      <div className="mt-4 rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="flex gap-1 border-b border-border px-4 pt-1">
          {["w-16", "w-20", "w-12", "w-24", "w-10"].map((w, i) => (
            <div key={i} className="px-3 py-2">
              <Skeleton className={`h-4 ${w}`} />
            </div>
          ))}
        </div>
        <table className="w-full text-[13px] border-collapse">
          <thead className="border-b border-border bg-elevated/20">
            <tr>
              {Array.from({ length: 9 }).map((_, i) => (
                <th key={i} className="px-4 py-2.5">
                  <Skeleton className="h-3 w-14" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-20 font-mono" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-28" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-20" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-20" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-5 w-12 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

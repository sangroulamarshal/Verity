import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-2 h-3.5 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* P&L summary cards */}
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[6px] border border-border bg-surface px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-28" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Monthly breakdown table */}
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        <table className="w-full text-[13px] border-collapse">
          <thead className="border-b border-border bg-elevated/20">
            <tr>
              {["w-20", "w-24", "w-24", "w-24"].map((w, i) => (
                <th key={i} className="px-5 py-2.5">
                  <Skeleton className={`h-3 ${w}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-16" /></td>
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

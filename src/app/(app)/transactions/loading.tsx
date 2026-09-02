import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><Skeleton className="h-5 w-36" /><Skeleton className="mt-2 h-3.5 w-56" /></div>
        <div className="flex gap-2"><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-32 rounded-md" /></div>
      </div>
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        {/* Tab strip */}
        <div className="flex gap-1 border-b border-border px-4 pt-1">
          {["w-28", "w-14", "w-16"].map((w, i) => (
            <div key={i} className="px-3 py-2"><Skeleton className={`h-4 ${w}`} /></div>
          ))}
        </div>
        <table className="w-full text-[13px] border-collapse">
          <thead className="border-b border-border bg-elevated/20">
            <tr>
              {["Date","Description","Customer","Category","Amount","Risk",""].map((_, i) => (
                <th key={i} className="px-4 py-2.5"><Skeleton className="h-3 w-14" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-5 py-2.5"><Skeleton className="h-3.5 w-16" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-36" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-20" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-5 w-12 rounded-full" /></td>
                <td className="px-4 py-2.5"><Skeleton className="h-5 w-5 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-1"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-7" /></div>
        </div>
      </div>
    </div>
  );
}

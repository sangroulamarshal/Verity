import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><Skeleton className="h-5 w-24" /><Skeleton className="mt-2 h-3.5 w-48" /></div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
        <table className="w-full text-[13px] border-collapse">
          <thead className="border-b border-border bg-elevated/30">
            <tr>
              {["Customer", "Contact", "Transactions", "Risk", "Last Activity", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left"><Skeleton className="h-3 w-16" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20 mt-1" /></div>
                  </div>
                </td>
                <td className="px-4 py-3"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-20 mt-1" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3.5 w-8 ml-auto" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-10 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-5 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
          <Skeleton className="h-3 w-32" />
          <div className="flex gap-1"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-7" /></div>
        </div>
      </div>
    </div>
  );
}

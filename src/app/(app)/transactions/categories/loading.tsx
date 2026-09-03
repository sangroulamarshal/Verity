import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[6px] border border-border bg-surface overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-32" /><Skeleton className="mt-1.5 h-3 w-48" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({length:12}).map((_,i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2">
                <Skeleton className="h-3.5 w-28" /><Skeleton className="h-5 w-14 rounded" />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[6px] border border-border bg-surface p-4">
          <Skeleton className="h-4 w-36 mb-1" /><Skeleton className="h-3 w-52 mb-4" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-8 flex-1 rounded-md" /><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <ul className="divide-y divide-border">
            {Array.from({length:5}).map((_,i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-3.5 w-24" />
                <div className="flex items-center gap-2"><Skeleton className="h-5 w-14 rounded" /><Skeleton className="h-6 w-6 rounded" /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

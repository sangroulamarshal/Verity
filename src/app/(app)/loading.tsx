import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-3">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex flex-col gap-1.5 px-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <div className="flex-1" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Skeleton className="h-6 w-48" />
        </main>
      </div>
    </div>
  );
}

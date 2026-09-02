import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function RiskLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><Skeleton className="h-5 w-12" /><Skeleton className="mt-2 h-3.5 w-72" /></div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      {/* 6 metric cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-4 py-3.5">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-20 mt-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Two-column: donut + recent alerts */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-4 flex justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border/50 last:border-0">
                <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-3 w-28" /></div>
                <Skeleton className="h-3.5 w-10" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* Table */}
      <div className="mt-4 rounded-[6px] border border-border bg-surface overflow-hidden">
        <div className="flex gap-1 border-b border-border px-4 pt-1">
          {["w-16","w-16","w-12","w-14","w-10","w-16"].map((w, i) => (
            <div key={i} className="px-3 py-2"><Skeleton className={`h-4 ${w}`} /></div>
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-2.5 last:border-0">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-32 flex-1" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-5 w-14 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="w-full px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><Skeleton className="h-5 w-32" /><Skeleton className="mt-1.5 h-3.5 w-56 mt-2" /></div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>

      {/* 5 KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-4 py-3.5">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-16 mt-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: chart + risk */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-0">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-1"><Skeleton className="h-5 w-8" /><Skeleton className="h-5 w-8" /><Skeleton className="h-5 w-8" /></div>
          </CardHeader>
          <CardContent className="pt-3"><Skeleton className="h-[220px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><Skeleton className="h-4 w-24" /></CardHeader>
          <CardContent className="pt-3"><Skeleton className="h-[180px] w-full rounded-full mx-auto max-w-[180px]" /></CardContent>
        </Card>
      </div>

      {/* Two-column: recent transactions + risk alerts */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-12" />
          </CardHeader>
          <CardContent className="p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-border/50 px-5 py-2.5 last:border-0">
                <div className="flex flex-col gap-1"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-12" />
          </CardHeader>
          <CardContent className="p-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3 last:border-0">
                <div className="flex flex-col gap-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-28" /></div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

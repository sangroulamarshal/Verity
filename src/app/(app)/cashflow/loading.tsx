import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CashFlowLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-1.5 h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-44 w-full" />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="p-0">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 last:border-b-0"
                >
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 last:border-b-0"
            >
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

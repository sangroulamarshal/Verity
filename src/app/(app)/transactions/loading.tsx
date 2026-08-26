import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mirrors transaction-tabs.tsx's TABS list exactly (All, Income,
// Expenses, Presets, Audit Log) so the skeleton's tab strip is the
// same width/shape as what replaces it — a placeholder that doesn't
// match what's coming is worse than no placeholder, since the layout
// still shifts once real content lands.
const TAB_LABEL_WIDTHS = ["w-8", "w-14", "w-16", "w-14", "w-16"];

export default function TransactionsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Card className="overflow-hidden py-0">
        {/* Tab strip — matches TransactionTabs' border-b + row of links. */}
        <div className="flex gap-1 border-b border-border px-4">
          {TAB_LABEL_WIDTHS.map((width, i) => (
            <div key={i} className="px-3 py-2.5">
              <Skeleton className={`h-4 ${width}`} />
            </div>
          ))}
        </div>

        {/* Filter bar — matches TransactionFilters' search input plus
            currency/payment-method selects and two date inputs. */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 flex-1 sm:max-w-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Customer/Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment method</TableHead>
                  <TableHead className="text-right">Original amount</TableHead>
                  <TableHead className="text-right">Display amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

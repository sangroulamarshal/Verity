import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/server/services/session";
import { listCustomers } from "@/server/services/customers";
import { canWriteCustomers } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerDialog } from "@/features/customers/customer-dialog";
import { CustomersTable } from "@/features/customers/customers-table";
import { CustomerSearch } from "@/features/customers/customer-search";

export const metadata: Metadata = {
  title: "Customers",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CustomersPage(props: PageProps<"/customers">) {
  const session = await verifySession();
  const searchParams = await props.searchParams;

  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const search = firstParam(searchParams.search);
  const canEdit = canWriteCustomers(session.role);

  const { rows, total, totalPages } = await listCustomers(session.organizationId, {
    page,
    search,
  });

  // Built once, reused by both pagination links — the transactions
  // page's equivalent links only encode `page`/`type` and silently drop
  // `search` when paging (a pre-existing gap, out of scope to fix here
  // since it touches a separately-tested page), but there's no reason
  // to carry that same gap into a page being built fresh right now.
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (search) params.set("search", search);
    return `/customers?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {total} customer{total === 1 ? "" : "s"} on file.
          </p>
        </div>
        {canEdit && (
          <CustomerDialog mode="create" trigger={<Button type="button">New customer</Button>} />
        )}
      </div>

      <Card className="overflow-hidden py-0">
        <div className="border-b border-border p-4">
          <CustomerSearch />
        </div>
        <CardContent className="p-0">
          <CustomersTable customers={rows} canEdit={canEdit} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page - 1)}>Previous</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page + 1)}>Next</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "@/server/services/customers";
import { CustomerDialog } from "./customer-dialog";
import { DeleteCustomerButton } from "./delete-customer-button";

interface CustomersTableProps {
  customers: Customer[];
  canEdit: boolean;
}

export function CustomersTable({ customers, canEdit }: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-sm font-medium">No customers found</p>
        <p className="text-sm text-muted-foreground">
          Try a different search, or add a new customer.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">
                <Link href={`/customers/${customer.id}`} className="hover:underline">
                  {customer.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.email ?? "\u2014"}</TableCell>
              <TableCell className="text-muted-foreground">{customer.phone ?? "\u2014"}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {canEdit && (
                    <>
                      <CustomerDialog
                        mode="edit"
                        customerId={customer.id}
                        defaultValues={{
                          name: customer.name,
                          email: customer.email ?? undefined,
                          phone: customer.phone ?? undefined,
                          notes: customer.notes ?? undefined,
                        }}
                        trigger={
                          <button className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                            Edit
                          </button>
                        }
                      />
                      <DeleteCustomerButton id={customer.id} />
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

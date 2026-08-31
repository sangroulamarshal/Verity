"use client";

import { useRouter } from "next/navigation";
import { DeleteCustomerButton } from "./delete-customer-button";

export function DeleteCustomerButtonWithRedirect({ id }: { id: string }) {
  const router = useRouter();

  return <DeleteCustomerButton id={id} onDeleted={() => router.push("/customers")} />;
}

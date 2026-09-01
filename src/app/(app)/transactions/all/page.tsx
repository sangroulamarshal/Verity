import { redirect } from "next/navigation";

// Redirect to the main transactions page which handles filtering
export default function Page() {
  redirect("/transactions");
}

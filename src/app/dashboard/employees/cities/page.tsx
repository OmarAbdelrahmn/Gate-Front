import { redirect } from "next/navigation";

export default function CitiesPage() {
  redirect("/dashboard/hr/catalogs?tab=cities");
}

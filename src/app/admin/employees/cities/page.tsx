import { redirect } from "next/navigation";

export default function CitiesPage() {
  redirect("/admin/hr/catalogs?tab=cities");
}

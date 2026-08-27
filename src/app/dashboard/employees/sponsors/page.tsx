import { redirect } from "next/navigation";

export default function SponsorsPage() {
  redirect("/dashboard/hr/catalogs?tab=sponsors");
}

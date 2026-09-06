import { redirect } from "next/navigation";

export default function SponsorsPage() {
  redirect("/admin/hr/catalogs?tab=sponsors");
}
